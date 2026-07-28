import { useState, useMemo, useRef, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search, Plus, Edit2, Trash2, GraduationCap, Building,
  X, BookOpen, Layers, Upload, Image as ImageIcon,
  Check, FileText, FileCheck2, Library,
  ChevronRight, CalendarDays,
  Eye, AlertCircle,
  // Iconos Seleccionables
  Cpu, FlaskConical, Briefcase, Stethoscope, Globe, Palette,
  Microscope, PenTool, Laptop, Zap, Database, Activity, Calculator,
  Compass, Leaf, Network, Wifi, RotateCcw
} from 'lucide-react';
import { FilterDropdown } from '../../../components/ui/FilterDropdown';
import { PageHero } from '../../../components/ui/PageHero';
import { ViewToggle } from '../../../components/ui/ViewToggle';
import { EstadoBadge } from '../../../components/ui/EstadoBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { CrudModal } from '../../../components/ui/CrudModal';
import { DataTable } from '../../../components/ui/DataTable';
import { confirmDelete } from '../../../lib/confirm';
import { MateriaHorarioModal } from '../components/MateriaHorarioModal';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { useMateriasStore } from '../../../store/materiasStore';
import { useRecursosStore } from '../../../store/recursosStore';
import { useMateriaRecursosStore } from '../../../store/materiaRecursosStore';

const availableIcons: Record<string, any> = {
  Cpu, FlaskConical, Briefcase, Stethoscope, Globe, Palette,
  Microscope, PenTool, Laptop, Zap, Database, Activity, Calculator,
  Compass, Leaf, Network, Wifi, BookOpen, Building
};

const availableColors = [
  { id: 'purple', hex: '#9333ea' },
  { id: 'blue', hex: '#2563eb' },
  { id: 'emerald', hex: '#10b981' },
  { id: 'amber', hex: '#d97706' },
  { id: 'rose', hex: '#e11d48' },
  { id: 'cyan', hex: '#0891b2' },
  { id: 'fuchsia', hex: '#c026d3' },
  { id: 'orange', hex: '#ea580c' },
];

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex) return `rgba(59, 130, 246, ${alpha})`;
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.length === 3 ? cleanHex.slice(0, 1).repeat(2) : cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.length === 3 ? cleanHex.slice(1, 2).repeat(2) : cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.length === 3 ? cleanHex.slice(2, 3).repeat(2) : cleanHex.slice(4, 6), 16);
  return `rgba(${r || 0}, ${g || 0}, ${b || 0}, ${alpha})`;
};

interface MateriaUI {
  id: string;
  idCarrera: string;
  semestre: number;
  nombre: string;
  codigo: string;
  creditos: number;
  silaboUrl: string | null;
  programaUrl: string | null;
  recursosIds: number[];
  creadoPor: string | null;
}

export const EstructuraAcademica = () => {
  // STORES
  const { facultades, carreras, fetchAll: fetchFacultades, addFacultad, updateFacultad, removeFacultad, addCarrera, updateCarrera, removeCarrera } = useFacultadesStore();
  const { materias: dbMaterias, fetchMaterias, updateMateria, addMateria, removeMateria } = useMateriasStore();
  const recursosData = useRecursosStore(state => state.recursos);
  const fetchRecursos = useRecursosStore(state => state.fetchRecursos);
  const { recursosMap, fetchByMaterias, toggleRecurso } = useMateriaRecursosStore();
  const { currentUser } = useOutletContext<any>();
  const esTecnico = currentUser?.role === 'tecnico';
  const carreraTecnico = useMemo(
    () => carreras.find(c =>
      (c.nombre || '').trim().toLocaleLowerCase('es') ===
      (currentUser?.carreraNombre || '').trim().toLocaleLowerCase('es'),
    ),
    [carreras, currentUser?.carreraNombre],
  );

  useEffect(() => {
    fetchFacultades();
    fetchMaterias();
    fetchRecursos();
  }, []);

  useEffect(() => {
    if (dbMaterias.length > 0) {
      fetchByMaterias(dbMaterias.map(m => m.id));
    }
  }, [dbMaterias]);

  // NAVIGATION STATE
  const [selectedFacultadId, setSelectedFacultadId] = useState<string | null>(null);
  const [selectedCarreraId, setSelectedCarreraId] = useState<string | null>(null);
  const [expandedFacultades, setExpandedFacultades] = useState<string[]>([]);
  const [searchNav, setSearchNav] = useState('');

  // Initial Selection
  useEffect(() => {
    if (esTecnico) {
      if (carreraTecnico) {
        setSelectedFacultadId(carreraTecnico.id_facultad);
        setSelectedCarreraId(carreraTecnico.id);
        setExpandedFacultades([carreraTecnico.id_facultad]);
      }
      return;
    }

    if (!selectedFacultadId && !selectedCarreraId && facultades.length > 0) {
      setSelectedFacultadId(facultades[0].id);
      setExpandedFacultades([facultades[0].id]);
    }
  }, [facultades, selectedFacultadId, selectedCarreraId, esTecnico, carreraTecnico]);

  const toggleExpand = (id: string) => {
    setExpandedFacultades(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const selectFacultad = (id: string) => {
    if (esTecnico && carreraTecnico) {
      selectCarrera(carreraTecnico.id_facultad, carreraTecnico.id);
      return;
    }
    setSelectedFacultadId(id);
    setSelectedCarreraId(null);
    if (!expandedFacultades.includes(id)) {
      setExpandedFacultades([...expandedFacultades, id]);
    }
  };

  const selectCarrera = (facultadId: string, carreraId: string) => {
    setSelectedFacultadId(facultadId);
    setSelectedCarreraId(carreraId);
    if (!expandedFacultades.includes(facultadId)) {
      setExpandedFacultades([...expandedFacultades, facultadId]);
    }
  };

  // MAPPED DATA
  const mappedFacultades = useMemo(() => facultades
    .filter(f => !esTecnico || f.id === carreraTecnico?.id_facultad)
    .map(f => ({
    ...f, colorHex: f.color_hex || '#3b82f6', customSvg: f.custom_svg, decano: f.decano || 'No Asignado', estado: f.estado || 'activo',
    totalCarreras: carreras.filter(c => c.id_facultad === f.id && (!esTecnico || c.id === carreraTecnico?.id)).length
  })), [facultades, carreras, esTecnico, carreraTecnico]);

  const mappedCarreras = useMemo(() => carreras
    .filter(c => !esTecnico || c.id === carreraTecnico?.id)
    .map(c => ({
    ...c, colorHex: c.color_hex || '#3b82f6', customSvg: c.custom_svg, idFacultad: c.id_facultad, director: c.director || 'No Asignado', semestres: c.semestres ?? 9, estado: c.estado || 'activo'
  })), [carreras, esTecnico, carreraTecnico]);

  const materias: MateriaUI[] = useMemo(() => (dbMaterias || []).map(m => ({
    id: m.id, idCarrera: m.id_carrera, semestre: m.semestre, nombre: m.nombre, codigo: m.codigo, creditos: m.creditos, silaboUrl: m.silabo_url ?? null, programaUrl: m.programa_url ?? null, recursosIds: recursosMap[m.id] || [], creadoPor: m.creado_por ?? null,
  })), [dbMaterias, recursosMap]);

  const puedeGestionarMateria = (materia: MateriaUI) =>
    !esTecnico || materia.creadoPor === currentUser?.id;

  // --- MODALS STATE ---
  const [modalType, setModalType] = useState<null | 'createFacultad' | 'editFacultad' | 'createCarrera' | 'editCarrera'>(null);
  const defaultFacultadValues = { siglas: '', nombre: '', decano: '', estado: 'activo', colorHex: '#3b82f6', icono: 'Building', customSvg: null as string | null };
  const [formFacultad, setFormFacultad] = useState(defaultFacultadValues);
  const defaultCarreraValues = { idFacultad: '', nombre: '', semestres: 9, director: '', estado: 'activo', colorHex: '#3b82f6', icono: 'BookOpen', customSvg: null as string | null };
  const [formCarrera, setFormCarrera] = useState(defaultCarreraValues);
  const [carreraError, setCarreraError] = useState<string | null>(null);
  // Id de la carrera en edición. selectedCarreraId NO sirve: al editar desde la vista
  // facultad (fila de tabla) no hay carrera seleccionada y el guardado se perdía.
  const [editingCarreraId, setEditingCarreraId] = useState<string | null>(null);

  useEffect(() => {
    if (modalType === 'createCarrera') setEditingCarreraId(null);
  }, [modalType]);

  const fileInputRefFacultad = useRef<HTMLInputElement>(null);
  const fileInputRefCarrera = useRef<HTMLInputElement>(null);

  // Materia Modal
  const [isAddingMateria, setIsAddingMateria] = useState(false);
  const [editingMateriaId, setEditingMateriaId] = useState<string | null>(null);
  const [formMateria, setFormMateria] = useState({ nombre: '', codigo: '', semestre: 1, creditos: 3, idCarrera: '' });
  const [materiaError, setMateriaError] = useState<string | null>(null);
  const [savingMateria, setSavingMateria] = useState(false);

  // Detalle Materia Modal
  const [selectedMateriaId, setSelectedMateriaId] = useState<string | null>(null);
  const [showRecursoPicker, setShowRecursoPicker] = useState(false);
  const [horarioMateria, setHorarioMateria] = useState<{ id: string; nombre: string; codigo?: string } | null>(null);

  // --- HANDLERS FACULTAD ---
  const handleSaveFacultad = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { nombre: formFacultad.nombre, siglas: formFacultad.siglas, color_hex: formFacultad.colorHex, icono: formFacultad.icono, custom_svg: formFacultad.customSvg, decano: formFacultad.decano, estado: formFacultad.estado };
    try {
      if (modalType === 'createFacultad') {
        await addFacultad({ id: 'FAC' + Date.now(), ...payload });
      } else if (modalType === 'editFacultad' && selectedFacultadId) {
        await updateFacultad(selectedFacultadId, payload);
      }
      setModalType(null);
    } catch (err: any) {
      import('sweetalert2').then(S => S.default.fire('Error al guardar', err?.message || 'No se pudo guardar la facultad.', 'error'));
    }
  };

  const handleDeleteFacultad = async (id: string, nombre: string) => {
    if (!(await confirmDelete({ title: `¿Eliminar "${nombre}"?`, text: 'Esta acción no se puede deshacer y afectará a sus carreras.' }))) return;
    await removeFacultad(id);
    if (selectedFacultadId === id) { setSelectedFacultadId(null); setSelectedCarreraId(null); }
  };

  // --- HANDLERS CARRERA ---
  const handleSaveCarrera = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarreraError(null);
    const duplicate = mappedCarreras.find(c => c.idFacultad === formCarrera.idFacultad && c.id !== editingCarreraId && (c.colorHex || '').toLowerCase() === (formCarrera.colorHex || '').toLowerCase());
    if (duplicate) { setCarreraError(`El color ${formCarrera.colorHex} ya está usado por ${duplicate.nombre}.`); return; }

    const payload = { nombre: formCarrera.nombre, id_facultad: formCarrera.idFacultad, color_hex: formCarrera.colorHex, icono: formCarrera.icono, custom_svg: formCarrera.customSvg, semestres: formCarrera.semestres, director: formCarrera.director, estado: formCarrera.estado };
    try {
      if (modalType === 'createCarrera') {
        await addCarrera({ id: 'CAR' + Date.now(), ...payload });
      } else if (modalType === 'editCarrera' && editingCarreraId) {
        await updateCarrera(editingCarreraId, payload);
      }
      setModalType(null);
      setEditingCarreraId(null);
    } catch (err: any) {
      setCarreraError(err?.message || 'No se pudo guardar la carrera.');
    }
  };

  const handleDeleteCarrera = async (id: string, nombre: string) => {
    if (!(await confirmDelete({ title: `¿Eliminar "${nombre}"?` }))) return;
    await removeCarrera(id);
    if (selectedCarreraId === id) setSelectedCarreraId(null);
  };

  // --- HANDLERS MATERIA ---
  const handleSaveMateria = async () => {
    if (!formMateria.nombre.trim() || !formMateria.codigo.trim() || !formMateria.idCarrera) {
      setMateriaError('Completa todos los campos obligatorios.'); return;
    }
    if (esTecnico && formMateria.idCarrera !== carreraTecnico?.id) {
      setMateriaError('Solo puedes registrar materias en la carrera asignada a tu perfil.');
      return;
    }
    if (editingMateriaId) {
      const materiaEditada = materias.find(m => m.id === editingMateriaId);
      if (materiaEditada && !puedeGestionarMateria(materiaEditada)) {
        setMateriaError('No puedes editar una materia registrada por otro usuario.');
        return;
      }
    }
    setSavingMateria(true); setMateriaError(null);
    try {
      if (editingMateriaId) {
        await updateMateria(editingMateriaId, { id_carrera: formMateria.idCarrera, codigo: formMateria.codigo.trim().toUpperCase(), nombre: formMateria.nombre.trim(), semestre: formMateria.semestre, creditos: formMateria.creditos });
      } else {
        await addMateria({ id: `MAT-${formMateria.codigo.trim().toUpperCase().replace(/\s+/g, '-')}-${Date.now()}`, id_carrera: formMateria.idCarrera, codigo: formMateria.codigo.trim().toUpperCase(), nombre: formMateria.nombre.trim(), semestre: formMateria.semestre, creditos: formMateria.creditos, silabo_url: null, programa_url: null, creado_por: currentUser?.id || null });
      }
      setIsAddingMateria(false);
      setEditingMateriaId(null);
    } catch (err: any) { setMateriaError(err?.message || 'Error al guardar.'); } finally { setSavingMateria(false); }
  };

  const handleDeleteMateria = async (m: { id: string; nombre: string }) => {
    const materia = materias.find(item => item.id === m.id);
    if (materia && !puedeGestionarMateria(materia)) return;
    if (await confirmDelete({ title: `¿Eliminar "${m.nombre}"?` })) removeMateria(m.id);
  };

  const handleUploadDoc = async (id: string, field: 'silaboUrl' | 'programaUrl', file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const dbField = field === 'silaboUrl' ? 'silabo_url' : 'programa_url';
    await updateMateria(id, { [dbField]: url });
  };

  // --- UI HELPERS ---
  const renderIconBox = (colorHex: string, customSvg: string | null, iconoName: string, FallbackIcon: any = Building, sizeClass: string = "w-9 h-9", iconSize: string = "w-4 h-4") => {
    const IconCmp = availableIcons[iconoName] || FallbackIcon;
    return (
      <div className={`${sizeClass} rounded-lg flex items-center justify-center shrink-0 border shadow-sm overflow-hidden`} style={{ backgroundColor: hexToRgba(colorHex, 0.1), color: colorHex, borderColor: hexToRgba(colorHex, 0.3) }}>
        {customSvg ? <img src={customSvg} alt="Icon" className="w-full h-full object-cover" /> : <IconCmp className={iconSize} />}
      </div>
    );
  };

  // --- FILTERS & VIEWS ---
  const [searchMateria, setSearchMateria] = useState('');
  const [selectedSemestreFilter, setSelectedSemestreFilter] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [carreraViewMode, setCarreraViewMode] = useState<'grid' | 'list'>('grid');
  const [searchCarrera, setSearchCarrera] = useState('');

  useEffect(() => { setSearchCarrera(''); }, [selectedFacultadId]);
  useEffect(() => { setSearchMateria(''); setSelectedSemestreFilter('Todos'); }, [selectedCarreraId]);

  const selectedFacultad = mappedFacultades.find(f => f.id === selectedFacultadId);
  const selectedCarrera = mappedCarreras.find(c => c.id === selectedCarreraId);

  const carreraMaterias = useMemo(() => materias.filter(m => m.idCarrera === selectedCarreraId), [materias, selectedCarreraId]);
  const allSemestres = useMemo(() => Array.from(new Set(carreraMaterias.map(m => m.semestre))).sort((a, b) => a - b), [carreraMaterias]);

  const filteredMaterias = useMemo(() => {
    return carreraMaterias.filter(m => {
      if (searchMateria && !(m.nombre || '').toLowerCase().includes(searchMateria.toLowerCase()) && !(m.codigo || '').toLowerCase().includes(searchMateria.toLowerCase())) return false;
      if (selectedSemestreFilter !== 'Todos' && m.semestre.toString() !== selectedSemestreFilter) return false;
      return true;
    });
  }, [carreraMaterias, searchMateria, selectedSemestreFilter]);

  const semestresMats = useMemo(() => {
    const map = new Map<number, MateriaUI[]>();
    filteredMaterias.forEach(m => {
      if (!map.has(m.semestre)) map.set(m.semestre, []);
      map.get(m.semestre)!.push(m);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredMaterias]);

  // Malla completa: sin filtros se muestran TODOS los PAO de la carrera (incluso vacíos),
  // para que el admin vea huecos de la malla; con filtros solo los que tienen coincidencias.
  const hasMateriaFilters = !!searchMateria || selectedSemestreFilter !== 'Todos';
  const paoColumns = useMemo<[number, MateriaUI[]][]>(() => {
    if (hasMateriaFilters) return semestresMats;
    const total = Math.max(selectedCarrera?.semestres || 0, ...carreraMaterias.map(m => m.semestre), 0);
    const map = new Map(semestresMats);
    return Array.from({ length: total }, (_, i) => [i + 1, map.get(i + 1) || []]);
  }, [semestresMats, hasMateriaFilters, selectedCarrera?.semestres, carreraMaterias]);

  const kpis = useMemo(() => ({
    materias: carreraMaterias.length,
    silabos: carreraMaterias.filter(m => m.silaboUrl).length,
    programas: carreraMaterias.filter(m => m.programaUrl).length,
    recursos: carreraMaterias.reduce((sum, m) => sum + m.recursosIds.length, 0),
  }), [carreraMaterias]);

  // KPIs a nivel facultad (vista facultad)
  const facultadCarreras = useMemo(() => mappedCarreras.filter(c => c.idFacultad === selectedFacultadId), [mappedCarreras, selectedFacultadId]);
  const filteredFacultadCarreras = useMemo(() => facultadCarreras.filter(c => (c.nombre || '').toLowerCase().includes(searchCarrera.toLowerCase())), [facultadCarreras, searchCarrera]);
  const materiasPorCarrera = useMemo(() => {
    const map: Record<string, number> = {};
    materias.forEach(m => { map[m.idCarrera] = (map[m.idCarrera] || 0) + 1; });
    return map;
  }, [materias]);
  const filteredNavFacultades = useMemo(() => {
    const q = searchNav.toLowerCase();
    return mappedFacultades.filter(f =>
      (f.nombre || '').toLowerCase().includes(q) ||
      (f.siglas || '').toLowerCase().includes(q) ||
      mappedCarreras.some(c => c.idFacultad === f.id && (c.nombre || '').toLowerCase().includes(q))
    );
  }, [mappedFacultades, mappedCarreras, searchNav]);

  const facultadKpis = useMemo(() => {
    const ids = new Set(facultadCarreras.map(c => c.id));
    const mats = materias.filter(m => ids.has(m.idCarrera));
    return {
      carreras: facultadCarreras.length,
      materias: mats.length,
      silabos: mats.filter(m => m.silaboUrl).length,
      recursos: mats.reduce((sum, m) => sum + m.recursosIds.length, 0),
    };
  }, [facultadCarreras, materias]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isFacultad: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Solo imágenes (SVG, PNG, JPG).'); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (isFacultad) setFormFacultad(p => ({ ...p, customSvg: event.target?.result as string }));
      else setFormCarrera(p => ({ ...p, customSvg: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const currentMateria = materias.find(m => m.id === selectedMateriaId) || null;
  const currentMateriaEditable = !!currentMateria && puedeGestionarMateria(currentMateria);

  return (
    <div className="flex flex-col h-screen bg-[#f4f7fb]">
      {selectedCarrera ? (
        <PageHero
          icon={availableIcons[selectedCarrera.icono] || BookOpen}
          title={selectedCarrera.nombre}
          subtitle={`${selectedFacultad?.siglas || ''} > ${selectedCarrera.semestres} PAO`}
          stats={[
            { Icon: BookOpen, value: selectedCarrera.semestres, label: 'PAOs' },
            { Icon: Layers, value: kpis.materias, label: 'Materias' },
            { Icon: FileCheck2, value: kpis.silabos, label: 'Sílabos' }
          ]}
        />
      ) : selectedFacultad ? (
        <PageHero
          icon={availableIcons[selectedFacultad.icono] || Building}
          title={selectedFacultad.nombre}
          subtitle={`Facultad • ${mappedCarreras.filter(c => c.idFacultad === selectedFacultad.id).length} Carreras`}
          stats={[
            { Icon: GraduationCap, value: facultadKpis.carreras, label: 'Carreras' },
            { Icon: Layers, value: facultadKpis.materias, label: 'Materias' },
            { Icon: FileCheck2, value: facultadKpis.silabos, label: 'Sílabos' }
          ]}
        />
      ) : (
        <PageHero
          icon={Building}
          title="Estructura Académica"
          subtitle="Gestión de facultades, carreras y mallas curriculares."
        />
      )}

      <div className="flex-1 flex p-6 md:p-8 min-h-0 bg-[#f4f7fb]/90 gap-6 overflow-hidden">
        {/* --- LEFT PANEL: TREE VIEW --- */}
        <div className="w-[280px] shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-gray-900">Facultades y carreras</h3>
              {!esTecnico && (
                <button
                  onClick={() => { setFormFacultad(defaultFacultadValues); setModalType('createFacultad'); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                  title="Agregar Facultad"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Buscar facultad o carrera..." value={searchNav} onChange={(e) => setSearchNav(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-medium text-gray-700 outline-none focus:border-indigo-400 transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-1">
            {filteredNavFacultades.length === 0 && (
              <EmptyState icon={Search} title="Sin resultados" description={`No hay coincidencias para "${searchNav}"`} secondaryLabel="Limpiar búsqueda" onSecondary={() => setSearchNav('')} className="py-10" />
            )}
            {filteredNavFacultades.map(fac => {
              const facCarreras = mappedCarreras.filter(c => c.idFacultad === fac.id);
              const isFacSelected = selectedFacultadId === fac.id && !selectedCarreraId;
              const isExpanded = expandedFacultades.includes(fac.id) || searchNav;

              return (
                <div key={fac.id} className="flex flex-col">
                  {/* Nodo Facultad */}
                  <div className={`relative flex items-center justify-between mb-1 group p-2 rounded-xl transition-all cursor-pointer overflow-hidden ${isFacSelected ? 'shadow-sm border' : 'hover:bg-gray-50 border border-transparent'}`} style={isFacSelected ? { backgroundColor: hexToRgba(fac.colorHex || '#2563eb', 0.06), borderColor: hexToRgba(fac.colorHex || '#2563eb', 0.25) } : undefined}>
                    {isFacSelected && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: fac.colorHex || '#2563eb' }} />}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => selectFacultad(fac.id)}>
                      <button onClick={(e) => { e.stopPropagation(); toggleExpand(fac.id); }} className="w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded-full shrink-0 transition-colors">
                        <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: fac.colorHex || '#2563eb' }} />
                      <span className="text-[13px] font-bold text-[#0f172a] truncate" title={fac.nombre}>{fac.siglas}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-gray-600 bg-white border border-gray-100 px-2 py-0.5 rounded-full shadow-sm" title={`${facCarreras.length} ${facCarreras.length === 1 ? 'carrera' : 'carreras'}`}>{facCarreras.length}</span>
                      {!esTecnico && (
                        <button onClick={(e) => { e.stopPropagation(); setFormCarrera({ ...defaultCarreraValues, idFacultad: fac.id }); setModalType('createCarrera'); }} className="w-6 h-6 border border-gray-200 bg-white rounded-md flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm" title="Agregar carrera">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nodos Carreras */}
                  {isExpanded && (
                    <div className="flex flex-col ml-[13px] mt-1 gap-2 border-l-[2px] pl-4 relative" style={{ borderColor: hexToRgba(fac.colorHex || '#2563eb', 0.35) }}>
                      {facCarreras.map(car => {
                        const isCarSelected = selectedCarreraId === car.id;
                        return (
                          <div key={car.id} onClick={() => selectCarrera(fac.id, car.id)} className={`group/car relative flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all overflow-hidden ${isCarSelected ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-sm' : 'bg-gray-50/30 hover:bg-gray-50 border border-gray-100 text-gray-900'}`}>
                            {isCarSelected && <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ backgroundColor: car.colorHex || '#3b82f6' }} />}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0`} style={{ backgroundColor: hexToRgba(car.colorHex || '#3b82f6', 0.1), color: car.colorHex || '#3b82f6' }}>
                                {car.customSvg ? <img src={car.customSvg} alt="icon" className="w-4 h-4" /> : (() => {
                                  const IconCmp = availableIcons[car.icono] || BookOpen;
                                  return <IconCmp className="w-4 h-4" />;
                                })()}
                              </div>
                              <span className={`text-[11.5px] font-bold truncate ${isCarSelected ? 'text-indigo-800' : 'text-[#0f172a]'}`} title={car.nombre}>{car.nombre}</span>
                            </div>
                            <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-opacity ${isCarSelected ? 'text-gray-400 opacity-100' : 'text-gray-300 opacity-0 group-hover/car:opacity-100'}`} />
                          </div>
                        );
                      })}

                      {facCarreras.length === 0 && !esTecnico && (
                        <button
                          onClick={() => { setFormCarrera({ ...defaultCarreraValues, idFacultad: fac.id }); setModalType('createCarrera'); }}
                          className="flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-200 rounded-xl text-[11px] font-bold text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors w-full"
                        >
                          <Plus className="w-3.5 h-3.5" /> Agregar carrera
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer resumen — badge diseño imagen */}
          <div className="px-4 py-3.5 border-t border-gray-100 shrink-0">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-[12.5px] font-bold text-gray-800 leading-tight">
                  {mappedFacultades.length} {mappedFacultades.length === 1 ? 'facultad' : 'facultades'} · {mappedCarreras.length} {mappedCarreras.length === 1 ? 'carrera' : 'carreras'}
                </p>
                <p className="text-[10px] text-gray-400 font-medium leading-tight">Estructura académica</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT PANEL: DYNAMIC CONTENT --- */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in relative">

          {/* MODO FACULTAD */}
          {selectedFacultad && !selectedCarreraId && (
            <div className="flex flex-col h-full overflow-hidden bg-white">
              <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-white">
                {/* CARD IDENTIDAD FACULTAD: datos y acciones propias de la facultad */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4 min-w-0">
                    {renderIconBox(selectedFacultad.colorHex, selectedFacultad.customSvg, selectedFacultad.icono, Building, "w-12 h-12", "w-6 h-6")}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[16px] font-bold text-gray-900 truncate">{selectedFacultad.nombre}</h3>
                        {<EstadoBadge estado={selectedFacultad.estado} />}
                      </div>
                      <p className="text-[11px] font-medium text-gray-400">{selectedFacultad.siglas} · Decano/a: {selectedFacultad.decano} · {facultadKpis.carreras} {facultadKpis.carreras === 1 ? 'carrera' : 'carreras'}</p>
                    </div>
                  </div>
                  {!esTecnico && <div className="flex items-center gap-3 shrink-0">
                    <button onClick={() => { setFormFacultad({ siglas: selectedFacultad.siglas, nombre: selectedFacultad.nombre, decano: selectedFacultad.decano, estado: selectedFacultad.estado, colorHex: selectedFacultad.colorHex, icono: selectedFacultad.icono, customSvg: selectedFacultad.customSvg }); setModalType('editFacultad'); }} className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 px-4 py-2 rounded-full text-[12px] font-bold transition-all shadow-sm flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5" /> Editar Facultad
                    </button>
                    <button onClick={() => handleDeleteFacultad(selectedFacultad.id, selectedFacultad.nombre)} className="bg-white border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 px-4 py-2 rounded-full text-[12px] font-bold transition-all shadow-sm flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>}
                </div>

                <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[14px] font-bold text-gray-800">Carreras ({filteredFacultadCarreras.length})</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={searchCarrera} onChange={(e) => setSearchCarrera(e.target.value)} placeholder="Buscar carrera..." className="w-[220px] pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-[12px] font-medium text-gray-700 outline-none focus:border-indigo-400 transition-colors placeholder:text-gray-400" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <ViewToggle value={carreraViewMode} onChange={setCarreraViewMode} />

                    {!esTecnico && (
                      <button onClick={() => { setFormCarrera({ ...defaultCarreraValues, idFacultad: selectedFacultad.id }); setModalType('createCarrera'); }} className="bg-[#0f172a] hover:bg-black text-white px-4 py-2 rounded-full text-[12px] font-bold transition-all shadow-sm flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> Nueva Carrera
                      </button>
                    )}
                  </div>
                </div>

                {carreraViewMode === 'list' ? (
                  <DataTable
                    rows={filteredFacultadCarreras}
                    rowKey={car => car.id}
                    onRowClick={car => selectCarrera(selectedFacultad.id, car.id)}
                    minWidthClass="min-w-[700px]"
                    emptyState={
                      <EmptyState
                        icon={GraduationCap}
                        title={searchCarrera ? `Sin resultados para "${searchCarrera}"` : 'Sin carreras registradas'}
                        actionLabel={searchCarrera || esTecnico ? undefined : 'Crear primera carrera'}
                        onAction={searchCarrera || esTecnico ? undefined : () => { setFormCarrera({ ...defaultCarreraValues, idFacultad: selectedFacultad.id }); setModalType('createCarrera'); }}
                        secondaryLabel={searchCarrera ? 'Limpiar búsqueda' : undefined}
                        onSecondary={searchCarrera ? () => setSearchCarrera('') : undefined}
                        className="py-12"
                      />
                    }
                    columns={[
                      {
                        key: 'nombre', header: 'Carrera', width: '1.6fr', sortValue: car => car.nombre,
                        render: car => (
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 border border-gray-100 shadow-sm bg-white" style={{ color: car.colorHex }}>
                              {car.customSvg ? <img src={car.customSvg} alt="icon" className="w-4 h-4" /> : (() => {
                                const IconCmp = availableIcons[car.icono] || BookOpen;
                                return <IconCmp className="w-4 h-4" />;
                              })()}
                            </div>
                            <span className="text-[13px] font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{car.nombre}</span>
                          </div>
                        ),
                      },
                      { key: 'semestres', header: 'Duración', width: '0.7fr', sortValue: car => car.semestres, render: car => <span className="text-[13px] font-medium text-gray-600">{car.semestres} PAO</span> },
                      { key: 'materias', header: 'Materias', width: '0.6fr', align: 'center', sortValue: car => materiasPorCarrera[car.id] || 0, render: car => <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">{materiasPorCarrera[car.id] || 0}</span> },
                      { key: 'director', header: 'Director', width: '1fr', sortValue: car => car.director, render: car => <span className="text-[13px] font-medium text-gray-500 truncate">{car.director}</span> },
                      { key: 'estado', header: 'Estado', width: '0.8fr', sortValue: car => car.estado, render: car => <EstadoBadge estado={car.estado} /> },
                      {
                        key: 'acciones', header: 'Acciones', width: '120px', align: 'right',
                        render: car => (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!esTecnico && (
                              <>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setEditingCarreraId(car.id); setFormCarrera({ idFacultad: car.idFacultad, nombre: car.nombre, semestres: car.semestres, director: car.director, estado: car.estado, colorHex: car.colorHex, icono: car.icono, customSvg: car.customSvg }); setModalType('editCarrera'); }} className="p-1.5 text-gray-400 hover:text-blue-600 bg-white rounded-md border border-gray-200 hover:border-blue-300 shadow-sm transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteCarrera(car.id, car.nombre); }} className="p-1.5 text-gray-400 hover:text-red-600 bg-white rounded-md border border-gray-200 hover:border-red-300 shadow-sm transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                              </>
                            )}
                            <button type="button" className="p-1.5 text-gray-400 hover:text-indigo-600 bg-white rounded-md border border-gray-200 hover:border-indigo-300 shadow-sm transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
                          </div>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredFacultadCarreras.map(car => (
                      <div key={car.id} onClick={() => selectCarrera(selectedFacultad.id, car.id)} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-lg transition-all cursor-pointer group flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full opacity-80" style={{ backgroundColor: car.colorHex || '#3b82f6' }} />

                        <div className="flex items-start justify-between mb-4 pl-1.5">
                          <div className="flex items-center gap-3">
                            {renderIconBox(car.colorHex, car.customSvg, car.icono, BookOpen, "w-10 h-10 shadow-sm border border-gray-100", "w-5 h-5")}
                          </div>
                          {<EstadoBadge estado={car.estado} />}
                        </div>

                        <h4 className="text-[15px] font-bold text-gray-900 group-hover:text-indigo-600 transition-colors pl-1.5 mb-1 line-clamp-2">{car.nombre}</h4>
                        <p className="text-[11px] font-medium text-gray-400 pl-1.5 mb-2 truncate">Director/a: {car.director}</p>

                        <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100 pl-1.5">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500">
                              <Layers className="w-4 h-4 text-gray-400" />
                              {car.semestres} PAO
                            </span>
                            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500">
                              <BookOpen className="w-4 h-4 text-gray-400" />
                              {materiasPorCarrera[car.id] || 0} materias
                            </span>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors border border-gray-100 group-hover:border-indigo-200">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredFacultadCarreras.length === 0 && (
                      <EmptyState
                        icon={GraduationCap}
                        variant="card"
                        title={searchCarrera ? `Sin resultados para "${searchCarrera}"` : 'Sin carreras registradas'}
                        description={searchCarrera ? undefined : 'Crea la primera carrera para esta facultad.'}
                        actionLabel={searchCarrera || esTecnico ? undefined : 'Crear primera carrera'}
                        onAction={searchCarrera || esTecnico ? undefined : () => { setFormCarrera({ ...defaultCarreraValues, idFacultad: selectedFacultad.id }); setModalType('createCarrera'); }}
                        secondaryLabel={searchCarrera ? 'Limpiar búsqueda' : undefined}
                        onSecondary={searchCarrera ? () => setSearchCarrera('') : undefined}
                        className="col-span-full"
                      />
                    )}
                  </div>
                )}
              </div>

            
            </div>
          )}

          {/* MODO CARRERA */}
          {selectedCarrera && (
            <div className="flex flex-col h-full overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-white">
                {/* BARRA DE HERRAMIENTAS TARJETA */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm mx-6 mt-6 mb-4 px-5 py-3 flex items-center justify-between gap-4 flex-wrap shrink-0">
                  <div className="flex items-center gap-4 flex-wrap">
                    <nav className="flex items-center gap-1.5 text-[12px] font-bold" aria-label="Breadcrumb">
                      <button onClick={() => setSelectedCarreraId(null)} className="text-gray-500 hover:text-indigo-600 transition-colors" title={`Volver a ${selectedFacultad?.nombre || 'la facultad'}`}>{selectedFacultad?.siglas || 'Facultad'}</button>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-gray-900 truncate max-w-[180px]">{selectedCarrera.nombre}</span>
                    </nav>
                    {<EstadoBadge estado={selectedCarrera.estado} />}
                    {!esTecnico && <div className="flex items-center gap-1">
                      <button onClick={() => { setEditingCarreraId(selectedCarrera.id); setFormCarrera({ nombre: selectedCarrera.nombre, semestres: selectedCarrera.semestres, icono: selectedCarrera.icono, idFacultad: selectedCarrera.idFacultad, estado: selectedCarrera.estado, director: selectedCarrera.director, colorHex: selectedCarrera.colorHex, customSvg: selectedCarrera.customSvg }); setModalType('editCarrera'); }} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar carrera">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteCarrera(selectedCarrera.id, selectedCarrera.nombre)} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar carrera">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>}
                    <div className="w-px h-6 bg-gray-200 hidden md:block"></div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" value={searchMateria} onChange={(e) => setSearchMateria(e.target.value)} placeholder="Buscar materia..." className="w-[220px] pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[12px] font-medium text-gray-700 outline-none focus:border-indigo-400 transition-colors" />
                    </div>
                    <FilterDropdown label="PAO" value={selectedSemestreFilter} options={[{ key: 'Todos', label: 'Todos' }, ...allSemestres.map(s => ({ key: s.toString(), label: `PAO ${s}` }))]} onChange={setSelectedSemestreFilter} />
                    {(searchMateria || selectedSemestreFilter !== 'Todos') && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-500">{filteredMaterias.length} de {carreraMaterias.length} materias</span>
                        <button onClick={() => { setSearchMateria(''); setSelectedSemestreFilter('Todos'); }} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                          <RotateCcw className="w-3 h-3" /> Limpiar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <ViewToggle value={viewMode} onChange={setViewMode} />
                    <button onClick={() => { setFormMateria({ nombre: '', codigo: '', semestre: 1, creditos: 3, idCarrera: selectedCarrera.id }); setIsAddingMateria(true); }} className="bg-[#0f172a] hover:bg-black text-white px-5 py-2.5 rounded-lg text-[12px] font-bold transition-all shadow-sm flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Agregar Materia
                    </button>
                  </div>
                </div>



                {/* TABS CONTENT */}
                <div className="flex-1 flex flex-col min-h-0 bg-white">

                  {viewMode === 'list' ? (
                    <div className="flex-1 m-6 mt-4 min-h-0 overflow-hidden">
                      <DataTable
                        fill
                        rows={filteredMaterias}
                        rowKey={m => m.id}
                        onRowClick={m => setSelectedMateriaId(m.id)}
                        minWidthClass="min-w-[800px]"
                        emptyState={
                          <EmptyState
                            icon={Layers}
                            title={carreraMaterias.length === 0 ? 'Sin materias registradas' : 'Sin resultados con estos filtros'}
                            actionLabel={carreraMaterias.length === 0 ? 'Agregar primera materia' : undefined}
                            onAction={carreraMaterias.length === 0 ? () => { setFormMateria({ nombre: '', codigo: '', semestre: 1, creditos: 3, idCarrera: selectedCarrera.id }); setIsAddingMateria(true); } : undefined}
                            secondaryLabel={carreraMaterias.length > 0 ? 'Limpiar filtros' : undefined}
                            onSecondary={carreraMaterias.length > 0 ? () => { setSearchMateria(''); setSelectedSemestreFilter('Todos'); } : undefined}
                          />
                        }
                        columns={[
                          { key: 'codigo', header: 'Código', width: '90px', sortValue: m => m.codigo, render: m => <span className="text-[11px] font-bold text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{m.codigo}</span> },
                          { key: 'nombre', header: 'Nombre de la materia', width: '2.5fr', sortValue: m => m.nombre, render: m => <span className="text-[12px] font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{m.nombre}</span> },
                          { key: 'semestre', header: 'PAO', width: '70px', align: 'center', sortValue: m => m.semestre, render: m => <span className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">{m.semestre}</span> },
                          { key: 'creditos', header: 'Créditos', width: '90px', align: 'center', sortValue: m => m.creditos, render: m => <span className="text-[11px] font-bold text-gray-700">{m.creditos} cr.</span> },
                          {
                            key: 'silabo', header: 'Estado sílabo', width: '1.3fr', sortValue: m => (m.silaboUrl ? 1 : 0),
                            render: m => m.silaboUrl ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100"><FileCheck2 className="w-3 h-3" /> Sílabo</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100"><AlertCircle className="w-3 h-3" /> Pendiente</span>
                            ),
                          },
                          {
                            key: 'recursos', header: 'Recursos', width: '90px', align: 'center', sortValue: m => m.recursosIds.length,
                            render: m => (
                              <div className="flex items-center justify-center gap-1.5">
                                <Library className={`w-3.5 h-3.5 ${m.recursosIds.length > 0 ? 'text-indigo-500' : 'text-gray-300'}`} />
                                <span className={`text-[11px] font-bold ${m.recursosIds.length > 0 ? 'text-indigo-700' : 'text-gray-400'}`}>{m.recursosIds.length}</span>
                              </div>
                            ),
                          },
                          {
                            key: 'acciones', header: 'Acciones', width: '120px', align: 'right',
                            render: m => (
                              <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button type="button" title="Horarios" onClick={(e) => { e.stopPropagation(); setHorarioMateria({ id: m.id, nombre: m.nombre, codigo: m.codigo }); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-indigo-400 hover:text-indigo-600 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm"><CalendarDays className="w-3.5 h-3.5" /></button>
                                {puedeGestionarMateria(m) && (
                                  <>
                                    <button type="button" title="Editar" onClick={(e) => { e.stopPropagation(); setFormMateria({ nombre: m.nombre, codigo: m.codigo, semestre: m.semestre, creditos: m.creditos, idCarrera: m.idCarrera }); setEditingMateriaId(m.id); setIsAddingMateria(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-blue-400 hover:text-blue-600 border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button type="button" title="Eliminar" onClick={(e) => { e.stopPropagation(); handleDeleteMateria(m); }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-red-400 hover:text-red-600 border border-gray-100 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </>
                                )}
                              </div>
                            ),
                          },
                        ]}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-x-auto custom-scrollbar p-6 bg-white">
                      {paoColumns.length === 0 ? (
                        <EmptyState
                          icon={Layers}
                          title={carreraMaterias.length === 0 ? 'Sin materias registradas' : 'Sin resultados con estos filtros'}
                          actionLabel={carreraMaterias.length === 0 ? 'Agregar primera materia' : undefined}
                          onAction={carreraMaterias.length === 0 ? () => { setFormMateria({ nombre: '', codigo: '', semestre: 1, creditos: 3, idCarrera: selectedCarrera.id }); setIsAddingMateria(true); } : undefined}
                          secondaryLabel={carreraMaterias.length > 0 ? 'Limpiar filtros' : undefined}
                          onSecondary={carreraMaterias.length > 0 ? () => { setSearchMateria(''); setSelectedSemestreFilter('Todos'); } : undefined}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex gap-5 h-full min-w-max items-start">
                          {paoColumns.map(([sem, mats], colIdx) => {
                            // Colores cíclicos para cada columna PAO, inspirados en la imagen
                            const paoColors = [
                              { border: '#3b82f6', bg: 'rgba(59,130,246,0.07)', iconBg: 'rgba(59,130,246,0.12)', iconColor: '#2563eb', badgeBg: '#eff6ff', badgeText: '#1d4ed8', badgeBorder: '#bfdbfe' },
                              { border: '#10b981', bg: 'rgba(16,185,129,0.07)', iconBg: 'rgba(16,185,129,0.12)', iconColor: '#059669', badgeBg: '#f0fdf4', badgeText: '#065f46', badgeBorder: '#a7f3d0' },
                              { border: '#f59e0b', bg: 'rgba(245,158,11,0.07)', iconBg: 'rgba(245,158,11,0.12)', iconColor: '#d97706', badgeBg: '#fffbeb', badgeText: '#92400e', badgeBorder: '#fde68a' },
                              { border: '#8b5cf6', bg: 'rgba(139,92,246,0.07)', iconBg: 'rgba(139,92,246,0.12)', iconColor: '#7c3aed', badgeBg: '#f5f3ff', badgeText: '#4c1d95', badgeBorder: '#ddd6fe' },
                              { border: '#ef4444', bg: 'rgba(239,68,68,0.07)', iconBg: 'rgba(239,68,68,0.12)', iconColor: '#dc2626', badgeBg: '#fef2f2', badgeText: '#7f1d1d', badgeBorder: '#fecaca' },
                              { border: '#06b6d4', bg: 'rgba(6,182,212,0.07)', iconBg: 'rgba(6,182,212,0.12)', iconColor: '#0891b2', badgeBg: '#ecfeff', badgeText: '#164e63', badgeBorder: '#a5f3fc' },
                            ];
                            const pc = paoColors[colIdx % paoColors.length];
                            return (
                              <div
                                key={sem}
                                className="flex flex-col w-[270px] shrink-0 rounded-2xl overflow-hidden"
                                style={{
                                  background: '#ffffff',
                                  border: '1.5px solid #e5e7eb',
                                  borderTop: `3px solid ${pc.border}`,
                                  boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                                }}
                              >
                                {/* Header PAO — diseño de imagen: ícono círculo + título + badge texto color + ··· */}
                                <div className="flex items-center justify-between px-4 py-3.5 bg-white">
                                  <div className="flex items-center gap-2.5">
                                    {/* Ícono en círculo coloreado */}
                                    <div
                                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                      style={{ background: pc.iconBg }}
                                    >
                                      <Layers className="w-4 h-4" style={{ color: pc.iconColor }} />
                                    </div>
                                    {/* Título PAO */}
                                    <span className="text-[14px] font-bold text-gray-900 tracking-tight">PAO {sem}</span>
                                    {/* Badge materias: texto del color del PAO, sin fondo relleno */}
                                    <span
                                      className="text-[11px] font-semibold"
                                      style={{ color: pc.iconColor }}
                                    >
                                      {mats.length} {mats.length === 1 ? 'materia' : 'materias'}
                                    </span>
                                  </div>
                                  {/* Tres puntos */}
                                  <button
                                    type="button"
                                    className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
                                    title="Opciones"
                                  >
                                    <span className="text-[18px] leading-none tracking-tighter select-none">···</span>
                                  </button>
                                </div>

                                {/* Materias */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-3" style={{ background: '#f4f6f8' }}>
                                  {mats.map((m) => (
                                    <div
                                      key={m.id}
                                      onClick={() => setSelectedMateriaId(m.id)}
                                      className="bg-white rounded-xl border border-gray-200 p-4 cursor-pointer group transition-all hover:shadow-md hover:border-indigo-200 flex flex-col gap-2"
                                    >
                                      {/* Fila superior: código + acciones */}
                                      <div className="flex items-center justify-between gap-2">
                                        <span
                                          className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md"
                                          style={{ background: pc.badgeBg, color: pc.badgeText, border: `1px solid ${pc.badgeBorder}` }}
                                        >
                                          {m.codigo}
                                        </span>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button
                                            type="button"
                                            title="Horarios"
                                            onClick={(e) => { e.stopPropagation(); setHorarioMateria({ id: m.id, nombre: m.nombre, codigo: m.codigo }); }}
                                            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                          >
                                            <CalendarDays className="w-3.5 h-3.5" />
                                          </button>
                                          {puedeGestionarMateria(m) && (
                                            <>
                                              <button
                                                type="button"
                                                title="Editar"
                                                onClick={(e) => { e.stopPropagation(); setFormMateria({ nombre: m.nombre, codigo: m.codigo, semestre: m.semestre, creditos: m.creditos, idCarrera: m.idCarrera }); setEditingMateriaId(m.id); setIsAddingMateria(true); }}
                                                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                              >
                                                <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                title="Eliminar"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteMateria(m); }}
                                                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Nombre de la materia */}
                                      <p className="text-[14px] font-bold text-gray-900 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
                                        {m.nombre}
                                      </p>

                                      {/* Footer: créditos + tipo */}
                                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                                            <Layers className="w-3.5 h-3.5 text-gray-400" />
                                            {m.creditos} créditos
                                          </span>
                                          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                                            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                            Obligatoria
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {m.silaboUrl ? (
                                            <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-500 flex items-center justify-center" title="Sílabo subido">
                                              <FileCheck2 className="w-3 h-3" />
                                            </div>
                                          ) : (
                                            <div className="w-5 h-5 rounded bg-orange-50 text-orange-400 flex items-center justify-center" title="Sílabo pendiente">
                                              <AlertCircle className="w-3 h-3" />
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Tags de categoría */}
                                      <div className="flex items-center justify-between">
                                        <span
                                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                          style={{ background: pc.badgeBg, color: pc.iconColor, border: `1px solid ${pc.badgeBorder}` }}
                                        >
                                          Básica
                                        </span>
                                        {m.recursosIds.length > 0 && (
                                          <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500">
                                            <Library className="w-3 h-3" />
                                            {m.recursosIds.length}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}

                                  {/* Botón Agregar Materia */}
                                  <button
                                    onClick={() => { setFormMateria({ nombre: '', codigo: '', semestre: sem, creditos: 3, idCarrera: selectedCarrera.id }); setIsAddingMateria(true); }}
                                    className="flex flex-col items-center justify-center gap-2 py-4 px-4 rounded-xl transition-all shrink-0 w-full"
                                    style={{
                                      border: '2px dashed #d1d5db',
                                      background: '#ffffff',
                                    }}
                                    onMouseEnter={e => {
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = pc.border;
                                      (e.currentTarget as HTMLButtonElement).style.background = pc.bg;
                                    }}
                                    onMouseLeave={e => {
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db';
                                      (e.currentTarget as HTMLButtonElement).style.background = '#ffffff';
                                    }}
                                  >
                                    {/* Círculo sólido relleno con + blanco */}
                                    <div
                                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                                      style={{ background: pc.iconColor }}
                                    >
                                      <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
                                    </div>
                                    <div className="text-center">
                                      <p className="text-[13px] font-bold text-gray-800">Agregar Materia</p>
                                      <p className="text-[11px] text-gray-400 font-normal mt-0.5">Arrastra o haz clic para añadir</p>
                                    </div>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {!selectedFacultad && !selectedCarreraId && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
              <Building className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Selecciona una facultad o carrera</h3>
              <p className="text-sm text-gray-500 max-w-sm">Navega por la estructura académica en el panel izquierdo para gestionar su información, o crea una nueva.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODALS (FACULTAD Y CARRERA) --- */}
      <CrudModal
        open={modalType === 'createFacultad' || modalType === 'editFacultad'}
        icon={Building}
        title={modalType === 'createFacultad' ? 'Nueva Facultad' : 'Editar Facultad'}
        subtitle="Completa los datos y personaliza el diseño"
        onClose={() => setModalType(null)}
        footer={<>
          <button onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
          <button type="submit" form="facultadForm" className="px-6 py-2.5 bg-[#0f172a] hover:bg-black text-white rounded-xl text-[12px] font-bold shadow-md transition-all">{modalType === 'createFacultad' ? 'Crear Facultad' : 'Guardar Cambios'}</button>
        </>}
      >
        <form id="facultadForm" onSubmit={handleSaveFacultad} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 ml-1">Siglas <span className="text-red-500">*</span></label>
              <input type="text" required value={formFacultad.siglas} onChange={e => setFormFacultad({ ...formFacultad, siglas: e.target.value })} className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium" placeholder="Ej: FIE" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 ml-1">Estado</label>
              <select value={formFacultad.estado} onChange={e => setFormFacultad({ ...formFacultad, estado: e.target.value })} className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium">
                <option value="activo">Activa</option>
                <option value="en_reorganizacion">En Reorganización</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 ml-1">Nombre Completo <span className="text-red-500">*</span></label>
            <input type="text" required value={formFacultad.nombre} onChange={e => setFormFacultad({ ...formFacultad, nombre: e.target.value })} className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium" placeholder="Facultad de..." />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 ml-1">Decano/a Actual</label>
            <input type="text" value={formFacultad.decano} onChange={e => setFormFacultad({ ...formFacultad, decano: e.target.value })} className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium" placeholder="Nombre del Decano" />
          </div>
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-3">Diseño Corporativo</h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-2">Color Hexadecimal</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2 px-3 w-full">
                    <input type="color" value={formFacultad.colorHex} onChange={e => setFormFacultad({ ...formFacultad, colorHex: e.target.value })} className="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0" />
                    <input type="text" value={formFacultad.colorHex} onChange={e => setFormFacultad({ ...formFacultad, colorHex: e.target.value })} className="w-full bg-transparent text-sm text-gray-700 font-medium outline-none uppercase" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {availableColors.map(c => (
                      <button key={c.id} type="button" onClick={() => setFormFacultad({ ...formFacultad, colorHex: c.hex })} className={`w-7 h-7 rounded-full shadow-sm border-2 transition-transform ${(formFacultad.colorHex || '').toLowerCase() === c.hex.toLowerCase() ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c.hex }} title={c.id} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-2">Ícono o Logotipo SVG</label>
                <div className="grid grid-cols-7 gap-2 mb-3">
                  {Object.keys(availableIcons).map(iconName => {
                    const IconCmp = availableIcons[iconName];
                    const isSelected = formFacultad.icono === iconName && !formFacultad.customSvg;
                    return (
                      <button key={iconName} type="button" onClick={() => setFormFacultad({ ...formFacultad, icono: iconName, customSvg: null })} className={`flex items-center justify-center p-2 rounded-xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                        <IconCmp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2">
                  <input type="file" ref={fileInputRefFacultad} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, true)} />
                  <button type="button" onClick={() => fileInputRefFacultad.current?.click()} className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl p-2.5">
                    <Upload className="w-4 h-4" /> {formFacultad.customSvg ? 'Reemplazar Imagen' : 'Subir SVG Personalizado'}
                  </button>
                  {formFacultad.customSvg && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-md border border-indigo-100">
                      <ImageIcon className="w-3.5 h-3.5" /> Imagen cargada
                      <button type="button" onClick={() => setFormFacultad({ ...formFacultad, customSvg: null })} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </CrudModal>

      <CrudModal
        open={modalType === 'createCarrera' || modalType === 'editCarrera'}
        icon={BookOpen}
        title={modalType === 'createCarrera' ? 'Nueva Carrera' : 'Editar Carrera'}
        subtitle="Asignación e identidad visual"
        onClose={() => setModalType(null)}
        footer={<>
          <button onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
          <button type="submit" form="carreraForm" className="px-6 py-2.5 bg-[#0f172a] hover:bg-black text-white rounded-xl text-[12px] font-bold shadow-md transition-all">{modalType === 'createCarrera' ? 'Crear Carrera' : 'Guardar Cambios'}</button>
        </>}
      >
        <form id="carreraForm" onSubmit={handleSaveCarrera} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 ml-1">Facultad a la que pertenece <span className="text-red-500">*</span></label>
            <select required value={formCarrera.idFacultad} onChange={e => setFormCarrera({ ...formCarrera, idFacultad: e.target.value })} className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium">
              <option value="" disabled>Seleccione una facultad...</option>
              {facultades.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 ml-1">Nombre de la Carrera <span className="text-red-500">*</span></label>
            <input type="text" required value={formCarrera.nombre} onChange={e => setFormCarrera({ ...formCarrera, nombre: e.target.value })} className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium" placeholder="Ej: Ingeniería de Software" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 ml-1">N° PAO</label>
              <input type="number" min={1} max={12} value={formCarrera.semestres} onChange={e => setFormCarrera({ ...formCarrera, semestres: parseInt(e.target.value) || 9 })} className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-600 ml-1">Estado</label>
              <select value={formCarrera.estado} onChange={e => setFormCarrera({ ...formCarrera, estado: e.target.value })} className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium">
                <option value="activo">Activa</option>
                <option value="en_reorganizacion">En Reorganización</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-gray-600 ml-1">Director/a de Carrera</label>
            <input type="text" value={formCarrera.director} onChange={e => setFormCarrera({ ...formCarrera, director: e.target.value })} className="w-full bg-white border border-gray-200 text-sm text-gray-800 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium" placeholder="Ing. Nombre Apellido" />
          </div>
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">Diseño Corporativo de la Carrera</h4>
            <p className="text-[9.5px] text-gray-500 mb-3">Nota: El color hexadecimal debe ser único dentro de la misma facultad.</p>
            {carreraError && <p className="text-[11px] text-red-500 font-bold bg-red-50 p-2 rounded-lg mb-3">{carreraError}</p>}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-2">Color Hexadecimal</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-2 px-3 w-full">
                    <input type="color" value={formCarrera.colorHex} onChange={e => setFormCarrera({ ...formCarrera, colorHex: e.target.value })} className="w-8 h-8 rounded cursor-pointer p-0 border-0 bg-transparent shrink-0" />
                    <input type="text" value={formCarrera.colorHex} onChange={e => setFormCarrera({ ...formCarrera, colorHex: e.target.value })} className="w-full bg-transparent text-sm text-gray-700 font-medium outline-none uppercase" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {availableColors.map(c => (
                      <button key={c.id} type="button" onClick={() => setFormCarrera({ ...formCarrera, colorHex: c.hex })} className={`w-7 h-7 rounded-full shadow-sm border-2 transition-transform ${(formCarrera.colorHex || '').toLowerCase() === c.hex.toLowerCase() ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`} style={{ backgroundColor: c.hex }} title={c.id} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-2">Ícono o Logotipo (SVG, PNG)</label>
                <div className="grid grid-cols-7 gap-2 mb-3">
                  {Object.keys(availableIcons).map(iconName => {
                    const IconCmp = availableIcons[iconName];
                    const isSelected = formCarrera.icono === iconName && !formCarrera.customSvg;
                    return (
                      <button key={iconName} type="button" onClick={() => setFormCarrera({ ...formCarrera, icono: iconName, customSvg: null })} className={`flex items-center justify-center p-2 rounded-xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                        <IconCmp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-2">
                  <input type="file" ref={fileInputRefCarrera} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, false)} />
                  <button type="button" onClick={() => fileInputRefCarrera.current?.click()} className="w-full flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl p-2.5">
                    <Upload className="w-4 h-4" /> {formCarrera.customSvg ? 'Reemplazar Imagen' : 'Subir Imagen'}
                  </button>
                  {formCarrera.customSvg && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-md border border-indigo-100">
                      <ImageIcon className="w-3.5 h-3.5" /> Imagen cargada
                      <button type="button" onClick={() => setFormCarrera({ ...formCarrera, customSvg: null })} className="ml-auto text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </CrudModal>

      {/* --- MODAL MATERIA (AGREGAR/EDITAR) --- */}
      <CrudModal
        open={isAddingMateria}
        icon={BookOpen}
        title={editingMateriaId ? 'Editar materia' : 'Agregar nueva materia'}
        subtitle="Datos de la materia en la malla curricular"
        onClose={() => setIsAddingMateria(false)}
        maxWidthClass="max-w-md"
        footer={<>
          <button onClick={() => setIsAddingMateria(false)} className="px-5 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
          <button onClick={handleSaveMateria} disabled={savingMateria} className="px-6 py-2.5 bg-[#0f172a] hover:bg-black disabled:opacity-60 text-white rounded-xl text-[12px] font-bold shadow-md transition-all">
            {savingMateria ? 'Guardando...' : 'Guardar materia'}
          </button>
        </>}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">Nombre de la materia</label>
            <input type="text" value={formMateria.nombre} onChange={e => setFormMateria({ ...formMateria, nombre: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Ej. Sistemas Distribuidos" />
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[11px] font-bold text-gray-700">Código</label>
              <input type="text" value={formMateria.codigo} onChange={e => setFormMateria({ ...formMateria, codigo: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Ej. SW-401" />
            </div>
            <div className="flex flex-col gap-1.5 w-[100px]">
              <label className="text-[11px] font-bold text-gray-700">PAO</label>
              <input type="number" min={1} max={12} value={formMateria.semestre} onChange={e => setFormMateria({ ...formMateria, semestre: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">Créditos</label>
            <select value={formMateria.creditos} onChange={e => setFormMateria({ ...formMateria, creditos: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
              {[1, 2, 3, 4, 5, 6].map(c => <option key={c} value={c}>{c} créditos</option>)}
            </select>
          </div>
          {materiaError && <p className="text-[11px] text-red-500 font-semibold bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{materiaError}</p>}
        </div>
      </CrudModal>

      {/* --- MODAL DETALLE MATERIA --- */}
      {currentMateria && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-[560px] relative animate-scale-in flex flex-col p-7 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => { setSelectedMateriaId(null); setShowRecursoPicker(false); }} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"><X className="w-4 h-4" /></button>
            <div className="flex items-start gap-3 mb-5 pr-8">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5" /></div>
              <div>
                <h3 className="text-[17px] font-bold text-gray-900 tracking-tight leading-tight">{currentMateria.nombre}</h3>
                <p className="text-[11px] font-medium text-gray-400 mt-0.5">{currentMateria.codigo} · PAO {currentMateria.semestre} · {currentMateria.creditos} créditos</p>
              </div>
            </div>
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">Documentos</p>
            <div className="flex flex-col gap-2 mb-5">
              <DocRow editable={currentMateriaEditable} label="Sílabo" Icon={FileCheck2} url={currentMateria.silaboUrl} onUpload={(f) => handleUploadDoc(currentMateria.id, 'silaboUrl', f)} onRemove={() => updateMateria(currentMateria.id, { silabo_url: null })} />
              <DocRow editable={currentMateriaEditable} label="Programa analítico" Icon={FileText} url={currentMateria.programaUrl} onUpload={(f) => handleUploadDoc(currentMateria.id, 'programaUrl', f)} onRemove={() => updateMateria(currentMateria.id, { programa_url: null })} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Recursos vinculados</p>
              {currentMateriaEditable && <button onClick={() => setShowRecursoPicker(v => !v)} className="text-[10px] font-bold text-[#0f172a] hover:text-black flex items-center gap-1"><Plus className="w-3 h-3" /> Vincular</button>}
            </div>
            <div className="flex flex-col gap-2">
              {currentMateria.recursosIds.length === 0 && !showRecursoPicker && <p className="text-[11px] text-gray-400 italic py-2">Sin recursos vinculados.</p>}
              {currentMateria.recursosIds.map(rid => {
                const r = recursosData.find(x => x.id === rid);
                if (!r) return null;
                return (
                  <div key={rid} className="flex items-center gap-3 p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl group">
                    <img src={r.portada_url ?? ''} className="w-8 h-10 object-cover rounded-md shrink-0 border border-gray-200" alt={r.titulo} />
                    <div className="flex-1 min-w-0"><p className="text-[12px] font-bold text-gray-800 truncate">{r.titulo}</p><p className="text-[10px] text-gray-400 truncate">{r.autor ?? r.tipo} · {r.formato}</p></div>
                    {currentMateriaEditable && <button onClick={() => toggleRecurso(currentMateria.id, rid)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                );
              })}
            </div>
            {currentMateriaEditable && showRecursoPicker && (
              <div className="mt-3 border border-gray-100 rounded-xl p-3 bg-gray-50/50 flex flex-col gap-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-bold text-gray-500 mb-1">Catálogo de recursos</p>
                {recursosData.map(r => {
                  const linked = currentMateria.recursosIds.includes(r.id);
                  return (
                    <button key={r.id} onClick={() => toggleRecurso(currentMateria.id, r.id)} className={`flex items-center gap-3 p-2 rounded-lg text-left transition-colors border ${linked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                      <img src={r.portada_url ?? ''} className="w-7 h-9 object-cover rounded shrink-0" alt={r.titulo} />
                      <div className="flex-1 min-w-0"><p className="text-[11.5px] font-bold text-gray-800 truncate">{r.titulo}</p><p className="text-[9.5px] text-gray-400 truncate">{r.autor ?? r.tipo}</p></div>
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${linked ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-300'}`}><Check className="w-3 h-3" /></span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Horario Materia Modal */}
      <MateriaHorarioModal open={!!horarioMateria} materia={horarioMateria} onClose={() => setHorarioMateria(null)} />
    </div>
  );
};

function DocRow({ label, Icon, url, onUpload, onRemove, editable = true }: { label: string; Icon: React.ElementType; url: string | null; onUpload: (file?: File) => void; onRemove: () => void; editable?: boolean; }) {
  const inputId = `doc-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const hasDoc = !!url;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${hasDoc ? 'bg-emerald-50/40 border-emerald-100' : 'bg-gray-50/60 border-gray-100'}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${hasDoc ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}><Icon className="w-4 h-4" /></div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-gray-800">{label}</p>
        <p className={`text-[10px] font-semibold ${hasDoc ? 'text-emerald-600' : 'text-gray-400'}`}>{hasDoc ? 'Cargado' : 'Sin documento'}</p>
      </div>
      {editable && <input id={inputId} type="file" accept="application/pdf" className="hidden" onChange={(e) => onUpload(e.target.files?.[0])} />}
      {hasDoc && url !== '#' && <a href={url} target="_blank" rel="noreferrer" className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 shrink-0" title="Ver"><Eye className="w-3.5 h-3.5" /></a>}
      {editable && <button onClick={() => document.getElementById(inputId)?.click()} className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 shrink-0" title="Subir PDF"><Upload className="w-3.5 h-3.5" /></button>}
      {editable && hasDoc && <button onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 shrink-0" title="Quitar"><Trash2 className="w-3.5 h-3.5" /></button>}
    </div>
  );
}

export default EstructuraAcademica;
