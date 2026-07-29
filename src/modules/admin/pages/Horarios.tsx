import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CalendarDays, Clock, DoorOpen, UserCheck,  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2, RefreshCcw, FileText } from 'lucide-react';
import { HorarioVista } from '../components/Horarios/HorarioVista';
import { MapaEspacios } from '../components/Horarios/MapaEspacios';
import { AsignacionModal } from '../components/Horarios/AsignacionModal';
import { ExportSidebar } from '../components/Horarios/ExportSidebar';
import { PlantillaPDF } from '../components/Horarios/PlantillaPDF';
import { PlantillaWord } from '../components/Horarios/PlantillaWord';
import { useClasesStore } from '../../../store/clasesStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useMateriasStore } from '../../../store/materiasStore';
import { useDocentesStore } from '../../../store/docentesStore';
import { horasFinDisponibles } from '../components/Horarios/horariosData';

export const Horarios = () => {
  // === SUPABASE STORES ===
  const { clases: rawClases, fetchClases, addClase, updateClase, removeClase, removeAllClases } = useClasesStore();
  const { items: espaciosRaw, fetchEspacios } = useEspaciosStore();
  const { carreras, fetchAll: fetchFacultades } = useFacultadesStore();

  const { items: edificiosRaw, fetchEdificios } = useEdificiosStore();
  const { fetchMaterias } = useMateriasStore();
  const { fetchDocentes } = useDocentesStore();
  
  useEffect(() => {
    fetchClases();
    fetchEspacios();
    fetchEdificios();
    fetchFacultades();
    fetchMaterias();
    fetchDocentes();
  }, []);

  // Mapear datos de Supabase al formato que esperan los sub-componentes
  const clases = useMemo(() => rawClases.map((c: any) => {
    const idCarrera = c.materias?.id_carrera || '';
    const carreraObj = carreras.find(car => car.id === idCarrera);
    return {
      id: c.id,
      materia: c.materias?.nombre || 'Sin materia',
      docente: c.docentes?.nombre || 'Sin docente',
      aula: c.espacios?.nombre || 'Sin aula',
      edificio: c.espacios?.id_edificio || '',
      tipoEspacio: c.espacios?.tipo || 'Academica',
      idFacultad: carreraObj ? carreraObj.id_facultad : '',
      idCarrera: idCarrera,
      idMateria: c.id_materia || '',
      idDocente: c.id_docente || '',
      idEspacio: c.id_espacio || '',
      dia: c.dia,
      hora: `${c.hora_inicio?.slice(0,5)} - ${c.hora_fin?.slice(0,5)}`,
      horaInicio: c.hora_inicio?.slice(0,5) || '07:00',
      horaFin: c.hora_fin?.slice(0,5) || '08:00',
      creadoPor: c.creado_por || '',
      _raw: c,
    };
  }), [rawClases, carreras]);

  const [activeTab, setActiveTab] = useState<'horario' | 'mapa'>('horario');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEdificio, setFilterEdificio] = useState('');
  const [filterAula, setFilterAula] = useState('');

  // Por defecto abre en el PRIMER edificio (no "Todos"), como una pestaña de Excel.
  // Solo una vez, al cargar los edificios; luego el admin puede cambiar o poner "Todos".
  const didInitEdificio = useRef(false);
  useEffect(() => {
    if (!didInitEdificio.current && edificiosRaw.length > 0) {
      setFilterEdificio(edificiosRaw[0].id);
      didInitEdificio.current = true;
    }
  }, [edificiosRaw]);

  // Sin "Todas": el aula por defecto es la PRIMERA del edificio seleccionado.
  // Cubre la carga inicial y el cambio de edificio (que resetea el aula a '').
  useEffect(() => {
    if (filterEdificio && !filterAula && espaciosRaw.length > 0) {
      const primera = [...espaciosRaw]
        .filter((e: any) => e.id_edificio === filterEdificio)
        .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es'))[0];
      if (primera) setFilterAula(primera.id);
    }
  }, [filterEdificio, filterAula, espaciosRaw]);

  // Map state
  const mapLocations = useMemo(() => {
    const locs: any[] = [];
    edificiosRaw.forEach(e => {
      if (e.lat && e.lng) {
        locs.push({
          id: `ed-${e.id}`,
          nombre: e.nombre,
          tipo: 'Edificio',
          lat: e.lat,
          lng: e.lng,
          estado: e.estado,
          imagen: e.imagen_url || 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=250&fit=crop',
          capacidad: (e.aulas_academicas || 0) * 30, // estimación
          detalle: e.direccion || 'Sin detalle'
        });
      }
    });
    espaciosRaw.forEach(esp => {
      if (esp.lat && esp.lng) {
        locs.push({
          id: `esp-${esp.id}`,
          nombre: esp.nombre,
          tipo: esp.tipo, // 'Academica', 'Laboratorio', etc.
          lat: esp.lat,
          lng: esp.lng,
          estado: esp.estado,
          imagen: esp.fotos_json && (esp.fotos_json as any[])[0] ? (esp.fotos_json as any[])[0] : 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=400&h=250&fit=crop',
          capacidad: esp.capacidad,
          detalle: `Piso ${esp.piso}`
        });
      }
    });
    return locs;
  }, [edificiosRaw, espaciosRaw]);
  const [mapFilterType, setMapFilterType] = useState('Todos');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-1.6583, -78.6780]);
  const [mapZoom, setMapZoom] = useState(17);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedClaseId, setSelectedClaseId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState({ idMateria: '', idDocente: '', idFacultad: '', idCarrera: '', idEdificio: '', tipoEspacio: '', idEspacio: '', dia: 'Lunes', horaInicio: '07:00', horaFin: '08:00' });

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportEdificio, setExportEdificio] = useState('');
  const [exportAula, setExportAula] = useState('');
  const [exportPeriodo, setExportPeriodo] = useState('MARZO 2026 - SEPTIEMBRE 2026');
  const [pdfZoom, setPdfZoom] = useState(100);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [paperSize, setPaperSize] = useState<'A4' | 'Carta'>('A4');
  const [includeFooter, setIncludeFooter] = useState(true);
  const [documentFontSize, setDocumentFontSize] = useState<number>(11);
  const [typography, setTypography] = useState<string>('Inter');
  const [headerImg, setHeaderImg] = useState<string>('');
  const [footerImg, setFooterImg] = useState<string>('');

  const { currentUser } = useOutletContext<any>();
  const esTecnico =
    currentUser?.role === 'tecnico' ||
    String(currentUser?.rol || '').toLocaleLowerCase('es').includes('técnico') ||
    String(currentUser?.rol || '').toLocaleLowerCase('es').includes('tecnico');
  const selectedClase = clases.find(c => c.id === selectedClaseId);
  const isReadOnly =
    modalMode === 'edit' &&
    esTecnico &&
    selectedClase?.creadoPor !== currentUser?.id;

  const totalClases = clases.length;
  const aulasUsadas = new Set(clases.map(c => c.aula)).size;
  const docentes = new Set(clases.map(c => c.docente)).size;

  useEffect(() => {
    const savedH = localStorage.getItem('espoch_header_img');
    const savedF = localStorage.getItem('espoch_footer_img');
    if (savedH) setHeaderImg(savedH);
    if (savedF) setFooterImg(savedF);
  }, [isExportModalOpen]);

  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = today.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  const handleSaveClase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'edit' && isReadOnly) {
      Swal.fire('Solo lectura', 'No puedes modificar una clase creada por otro técnico.', 'warning');
      return;
    }

    try {
      if (modalMode === 'create') {
        if (!formValues.idMateria || !formValues.idDocente || !formValues.idEspacio) {
          Swal.fire('Error', 'Por favor, complete todos los campos requeridos (Materia, Docente, Espacio).', 'error');
          return;
        }
      }

      const horaInicio = formValues.horaInicio;
      const horaFin = formValues.horaFin;
      if (!horasFinDisponibles(horaInicio).includes(horaFin)) {
        Swal.fire('Horario no disponible', 'La hora de fin debe ser posterior al inicio y la clase puede durar como máximo cuatro horas.', 'warning');
        return;
      }

      // ── Control de cruces: misma aula o mismo docente, mismo día, horas solapadas ──
      const nuevoIni = horaInicio + ':00';
      const nuevoFin = horaFin + ':00';
      const solapa = (c: any) => nuevoIni < c.hora_fin && nuevoFin > c.hora_inicio && c.dia === formValues.dia;
      const otras = (rawClases as any[]).filter(c => c.id !== selectedClaseId);

      const choqueAula = otras.find(c => c.id_espacio === formValues.idEspacio && solapa(c));
      if (choqueAula) {
        Swal.fire('Aula ocupada', `Esa aula ya tiene "${choqueAula.materias?.nombre || 'otra clase'}" el ${formValues.dia} en ${(choqueAula.hora_inicio || '').slice(0,5)}–${(choqueAula.hora_fin || '').slice(0,5)}. Elige otra hora o aula.`, 'warning');
        return;
      }
      const choqueDocente = otras.find(c => c.id_docente === formValues.idDocente && solapa(c));
      if (choqueDocente) {
        Swal.fire('Docente ocupado', `Ese docente ya dicta "${choqueDocente.materias?.nombre || 'otra clase'}" el ${formValues.dia} en ese horario.`, 'warning');
        return;
      }

      if (modalMode === 'create') {
        await addClase({
          id: 'CLA' + Date.now(),
          id_materia: formValues.idMateria,
          id_docente: formValues.idDocente,
          id_espacio: formValues.idEspacio,
          dia: formValues.dia,
          hora_inicio: nuevoIni,
          hora_fin: nuevoFin,
          creado_por: currentUser?.id || null
        });
      } else {
        if (selectedClaseId) {
          await updateClase(selectedClaseId, {
            id_materia: formValues.idMateria || undefined,
            id_docente: formValues.idDocente || undefined,
            id_espacio: formValues.idEspacio || undefined,
            dia: formValues.dia,
            hora_inicio: nuevoIni,
            hora_fin: nuevoFin,
          });
        }
      }
      setIsModalOpen(false);
      Swal.fire('Éxito', 'Clase guardada correctamente', 'success');
    } catch (err: any) {
      Swal.fire('Error al guardar', err.message || 'Error desconocido', 'error');
    }
  };

  const handleDeleteClase = async () => {
    if (isReadOnly) {
      Swal.fire('Solo lectura', 'No puedes eliminar una clase creada por otro técnico.', 'warning');
      return;
    }

    if (selectedClaseId) {
      try {
        await removeClase(selectedClaseId);
        setIsModalOpen(false);
      } catch (err: any) {
        Swal.fire('No se pudo eliminar', err?.message || 'No tienes permiso para eliminar esta clase.', 'error');
      }
    }
  };

  const handleFormatAll = () => {
    if (esTecnico) {
      Swal.fire('Acción no permitida', 'Solo un administrador puede eliminar todo el horario.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: "¡Se eliminarán todas las clases registradas en el sistema!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar todo',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        removeAllClases()
          .then(() => Swal.fire('¡Formateado!', 'Todas las clases han sido eliminadas exitosamente.', 'success'))
          .catch(() => Swal.fire('Error', 'No se pudieron eliminar las clases.', 'error'));
      }
    });
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById('documento-pdf-oficial');
      if (!element) return;
      
      const isLandscape = orientation === 'horizontal';
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error("Cannot access iframe document");
      }
      
      const styleTags = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).map(el => el.outerHTML).join('\n');

      iframeDoc.write(`
        <html>
        <head>
          <meta charset="utf-8">
          <title>${exportEdificio}_${exportAula || 'Blanco'}</title>
          ${styleTags}
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Roboto:wght@400;500;700;900&family=Montserrat:wght@400;500;700;900&family=Open+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: ${paperSize === 'Carta' ? 'letter' : 'A4'} ${isLandscape ? 'landscape' : 'portrait'};
              margin: 15mm 25mm 15mm 25mm;
            }
            * { box-sizing: border-box; transform: none !important; transform-origin: unset !important; }
            html, body { width: 100%; height: 100%; font-size: 11px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
            .schedule-table { border-collapse: collapse; width: 100%; }
            .schedule-table th, .schedule-table td { border: 1.5px solid black !important; padding: 15px 15px; text-align: center; }
            .schedule-table th { font-weight: 900; text-transform: uppercase; }
            img { max-width: 100%; height: auto; }
            .printable-area { margin: 0 !important; padding: 0 40px 20px 40px !important; box-shadow: none !important; min-height: auto !important; width: 100% !important; }
            * { page-break-before: avoid !important; page-break-after: avoid !important; page-break-inside: avoid !important; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="printable-area">
            ${element.innerHTML}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                document.querySelectorAll('.flex-shrink-0').forEach(el => { el.style.transform = 'none'; });
              }, 100);
            };
          </script>
        </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1000);
        setIsGeneratingPDF(false);
      }, 1500);

    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar PDF. Intente nuevamente.");
    } finally {
      setTimeout(() => setIsGeneratingPDF(false), 4500);
    }
  };

  const getExportStyles = () => {
    return `<style> .schedule-table { border-collapse: collapse; width: 100%; } .schedule-table th, .schedule-table td { border: 1.5px solid black; padding: 8px; text-align: center; } .schedule-table th { font-weight: bold; } </style>`;
  };

  const getWordPageSetup = () => {
    return `<style> @page Section1 { size:841.9pt 595.3pt; mso-page-orientation:landscape; margin:1.0cm 1.5cm 1.0cm 1.5cm; mso-header-margin:35.4pt; mso-footer-margin:35.4pt; mso-paper-source:0; } div.Section1 { page:Section1; } </style>`;
  };

  const handleDownloadWord = () => {
    const element = document.getElementById('documento-word-oficial');
    if (!element) return;
    const fullHTML = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word</title>${getExportStyles()}${getWordPageSetup()}</head><body><div class='Section1'>${element.innerHTML}</div></body></html>`;
    const blob = new Blob([fullHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${exportEdificio}_${exportAula || 'Blanco'}.doc`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetFilters = () => {
    setExportEdificio(''); setExportAula(''); setExportPeriodo('MARZO 2026 - SEPTIEMBRE 2026'); setPdfZoom(100); setOrientation('vertical');
    setPaperSize('A4'); setIncludeFooter(true); setDocumentFontSize(11); setTypography('Inter');
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f7fb]">
      {/* HERO SECTION */}
      <div className="w-full min-h-[120px] bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
        
        <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
              <Clock className="w-7 h-7" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[28px] md:text-[34px] font-bold text-white tracking-tight leading-none mb-1.5">
                Horarios
              </h2>
              <p className="text-[13px] text-gray-400 font-medium">Asigne docentes, aulas y edificios a los bloques horarios.</p>
            </div>
          </div>

          {/* TABS EN EL CENTRO DEL HERO */}
          <div className="flex-1 flex justify-center hidden lg:flex min-w-0 order-3 w-full mt-4 lg:order-none lg:w-auto lg:mt-0">
            <div className="flex items-center bg-[#212730]/80 rounded-xl p-1.5 border border-white/5 shadow-inner">
              <button onClick={() => setActiveTab('horario')} className={`px-6 py-2.5 rounded-lg text-[12px] font-bold transition-all uppercase tracking-wide ${activeTab === 'horario' ? 'bg-[#df0000] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Horario Semestral</button>
              <button onClick={() => setActiveTab('mapa')} className={`px-6 py-2.5 rounded-lg text-[12px] font-bold transition-all uppercase tracking-wide ${activeTab === 'mapa' ? 'bg-[#df0000] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Mapa de Espacios</button>
            </div>
          </div>
          <div className="flex lg:hidden items-center bg-[#212730]/80 rounded-xl p-1.5 border border-white/5 shadow-inner w-full sm:w-auto">
            <button onClick={() => setActiveTab('horario')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wide ${activeTab === 'horario' ? 'bg-[#df0000] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Semestral</button>
            <button onClick={() => setActiveTab('mapa')} className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wide ${activeTab === 'mapa' ? 'bg-[#df0000] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Mapa</button>
          </div>
          <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{totalClases.toString().padStart(2, '0')}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Clases</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <div className="flex items-center gap-3">
              <DoorOpen className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{aulasUsadas.toString().padStart(2, '0')}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Aulas</span>
              </div>
            </div>
            <div className="w-px h-8 bg-white/10 mx-1"></div>
            <div className="flex items-center gap-3">
              <UserCheck className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-white leading-tight">{docentes.toString().padStart(2, '0')}</span>
                <span className="text-[10px] font-medium text-gray-400 leading-none">Docentes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print { 
          @page { size: ${orientation === 'vertical' ? 'portrait' : 'landscape'}; margin: 15mm 25mm; } 
          body * { visibility: hidden; } 
          .printable-area, .printable-area * { visibility: visible; } 
          .printable-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100vw !important; height: auto !important; margin: 0 !important; padding: 0 !important; background: white !important; box-shadow: none !important; transform: scale(1) !important; } 
          .no-print { display: none !important; } 
        }
      `}} />

      <div className={`flex-1 flex flex-col min-h-0 relative h-full animate-fade-in ${isExportModalOpen ? 'p-1 md:p-2' : 'p-4 md:p-5'}`}>
        {!isExportModalOpen ? (
          <>
            {/* El tab selector se movió al Hero Section */}
            <div className="flex-1 min-h-0 relative">
              {activeTab === 'horario' && (
                <HorarioVista 
                  searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                  filterEdificio={filterEdificio} setFilterEdificio={setFilterEdificio}
                  filterAula={filterAula} setFilterAula={setFilterAula}
                  setIsExportModalOpen={setIsExportModalOpen}
                  setExportEdificio={setExportEdificio} setExportAula={setExportAula}
                  setModalMode={setModalMode} setFormValues={setFormValues} setIsModalOpen={setIsModalOpen}
                  clases={clases} 
                  carreras={carreras}
                  edificios={edificiosRaw}
                  espacios={espaciosRaw}
                  setSelectedClaseId={setSelectedClaseId}
                  handleFormatAll={handleFormatAll}
                  canFormatAll={!esTecnico}
                />
              )}
              {activeTab === 'mapa' && (
                <MapaEspacios 
                  mapLocations={mapLocations}
                  mapFilterType={mapFilterType} setMapFilterType={setMapFilterType}
                  mapSearchQuery={mapSearchQuery} setMapSearchQuery={setMapSearchQuery}
                  activeLocationId={activeLocationId} setActiveLocationId={setActiveLocationId}
                  mapCenter={mapCenter} setMapCenter={setMapCenter}
                  mapZoom={mapZoom} setMapZoom={setMapZoom}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden animate-fade-in px-1">
            <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-y-auto lg:overflow-hidden">
              <ExportSidebar 
                setIsExportModalOpen={setIsExportModalOpen}
                exportEdificio={exportEdificio} setExportEdificio={setExportEdificio}
                exportAula={exportAula} setExportAula={setExportAula}
                exportPeriodo={exportPeriodo} setExportPeriodo={setExportPeriodo}
                orientation={orientation} setOrientation={setOrientation}
                paperSize={paperSize} setPaperSize={setPaperSize}
                includeFooter={includeFooter} setIncludeFooter={setIncludeFooter}
                documentFontSize={documentFontSize} setDocumentFontSize={setDocumentFontSize}
                typography={typography} setTypography={setTypography}
                formattedDate={formattedDate} formattedTime={formattedTime}
                handlePrint={handleDownloadPDF} handleResetFilters={handleResetFilters}
              />

              <div className="flex-1 flex flex-col h-full bg-[#f1f3f4] rounded-[20px] overflow-hidden border border-gray-200/50 min-h-[600px] lg:min-h-0">
                <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
                  <div className="flex items-center gap-4 bg-gray-50/50 p-1.5 border border-gray-100 rounded-xl">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><CalendarDays className="w-3.5 h-3.5" /></div>
                    <div className="flex flex-col justify-center">
                      <span className="text-[9px] font-bold text-gray-700">Última generación</span>
                      <span className="text-[8px] text-gray-400 font-extrabold">{formattedDate}, {formattedTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200/80 pr-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[8px] font-extrabold text-emerald-600 uppercase tracking-wider">Vista lista para impresión</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1 bg-white rounded-md border border-gray-200 p-0.5 shadow-sm">
                      <button onClick={() => setPdfZoom(z => Math.max(z - 10, 50))} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ZoomOut className="w-3.5 h-3.5"/></button>
                      <span className="text-[11px] font-extrabold text-gray-700 w-20 text-center select-none">Zoom {pdfZoom}%</span>
                      <button onClick={() => setPdfZoom(z => Math.min(z + 10, 200))} className="p-1 hover:bg-gray-100 rounded text-gray-500"><ZoomIn className="w-3.5 h-3.5"/></button>
                    </div>

                    <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Página</span>
                      <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        <button className="p-0.5 text-gray-300"><ChevronLeft className="w-4 h-4"/></button>
                        <div className="px-1.5 text-[11px] font-bold text-gray-700">1 / 1</div>
                        <button className="p-0.5 text-gray-300"><ChevronRight className="w-4 h-4"/></button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4 pr-2">
                      <button onClick={() => setPdfZoom(100)} className="flex items-center gap-1.5 text-[11px] font-extrabold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 shadow-sm transition-all cursor-pointer">
                        <Maximize2 className="w-3.5 h-3.5" /> Ajustar al ancho
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="flex flex-col items-center justify-center py-1.5 px-3 border border-red-100 rounded-xl bg-red-50/50 hover:bg-red-50 text-red-700 transition-colors shadow-sm gap-0.5 hover:shadow cursor-pointer min-w-[56px]">
                      {isGeneratingPDF ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-red-600" />}
                      <span className="text-[9px] font-bold">PDF</span>
                    </button>
                    <button onClick={handleDownloadWord} className="flex flex-col items-center justify-center py-1.5 px-3 border border-blue-100 rounded-xl bg-blue-50/50 hover:bg-blue-50 text-blue-700 transition-colors shadow-sm gap-0.5 hover:shadow cursor-pointer min-w-[56px]">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-[9px] font-bold">DOCX</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto pt-4 pb-10 px-10 flex justify-center items-start custom-scrollbar">
                  <PlantillaPDF 
                    pdfZoom={pdfZoom}
                    orientation={orientation}
                    typography={typography}
                    headerImg={headerImg}
                    footerImg={footerImg}
                    documentFontSize={documentFontSize}
                    exportAula={exportAula}
                    exportEdificio={exportEdificio}
                    exportPeriodo={exportPeriodo}
                    clases={clases}
                    includeFooter={includeFooter}
                  />
                  
                  {/* Hidden templates for Word exports */}
                  <div className="hidden">
                    <PlantillaWord 
                      pdfZoom={100}
                      orientation={orientation}
                      typography={typography}
                      headerImg={headerImg}
                      footerImg={footerImg}
                      documentFontSize={documentFontSize}
                      exportAula={exportAula}
                      exportEdificio={exportEdificio}
                      exportPeriodo={exportPeriodo}
                      clases={clases}
                      includeFooter={includeFooter}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <AsignacionModal
            formValues={formValues}
            setFormValues={setFormValues}
            modalMode={modalMode}
            setIsModalOpen={setIsModalOpen}
            handleSaveClase={handleSaveClase}
            handleDeleteClase={handleDeleteClase}
            isReadOnly={isReadOnly}
            creadoPor={selectedClase?.creadoPor}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
};
