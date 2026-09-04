import { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Search, Trash2, X, AlertTriangle, Layers, Download, ArrowUpDown, Settings, Image as ImageIcon, ChevronDown, User, FileEdit, PenTool, Upload, Edit2, UploadCloud, FileDown, CheckCircle, RotateCcw
} from 'lucide-react';
import { generatePreviewPDF } from '../utils/documentGenerator';
import { useFormatosStore } from '../../../store/formatosStore';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';
import { Pagination } from '../../../components/ui/Pagination';

export const Formatos = () => {
  const { formatos, fetchFormatos, addFormato, updateFormato, removeFormato } = useFormatosStore();

  useEffect(() => { fetchFormatos(); }, []);

  // Mapear campos de BD al formato del componente
  const data = useMemo(() => formatos.map((f: any) => ({
    id: f.id,
    nombre: f.nombre,
    tipo: f.tipo,
    fecha: f.created_at?.slice(0, 10) || '',
    size: '-',
    estado: f.estado,
    descripcion: f.descripcion || '',
    data: f.datos ?? null,
  })), [formatos]);

  const kpi = useMemo(() => ({
    total: data.length, activos: data.filter(f => f.estado === 'activo').length,
    dinamicos: data.filter(f => f.tipo === 'DINAMICO').length, estaticos: data.filter(f => f.tipo !== 'DINAMICO').length,
  }), [data]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortCol, setSortCol] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [tipoFilter, setTipoFilter] = useState('Todos');

  // Settings: Imágenes institucionales (Base64)
  const [headerImg, setHeaderImg] = useState<string>('');
  const [footerImg, setFooterImg] = useState<string>('');

  useEffect(() => {
    const savedH = localStorage.getItem('espoch_header_img');
    const savedF = localStorage.getItem('espoch_footer_img');
    if (savedH) setHeaderImg(savedH);
    if (savedF) setFooterImg(savedF);
  }, []);

  const saveSettings = (h: string, f: string) => {
    localStorage.setItem('espoch_header_img', h);
    localStorage.setItem('espoch_footer_img', f);
    setHeaderImg(h);
    setFooterImg(f);
  };

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalType, setModalType] = useState<null | 'create' | 'delete' | 'bulkDelete' | 'view' | 'settings' | 'edit' | 'import'>(null);
  const [selectedFmt, setSelectedFmt] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New state for Detail Side Panel
  const [selectedFormatForDetail, setSelectedFormatForDetail] = useState<any>(null);

  const defaultGenValues = {
    nombreFormato: '',
    ciudadOficio: 'Riobamba',
    fechaOficio: new Date().toISOString().split('T')[0],
    tituloAutoridad: 'Ing.',
    tituloAutoridadOtro: '',
    nombreAutoridad: 'NOMBRE DE A QUIEN VA EL OFICIO',
    cargoDestinatario: 'DIRECTOR DE LA CARRERA DE ELECTRICIDAD',
    enSuDespacho: 'En su despacho,',
    nombresApellidos: 'NOMBRES Y APELLIDOS',
    ci: '1234567890',
    codigoEstudiantil: '123',
    numeroPao: 'PAO 1',
    carrera: 'NOMBRE DE LA CARRERA',
    facultad: 'FACULTAD CORRESPONDIENTE',
    descripcion: 'LO QUE SE SOLICITA',
    despedida: 'Agradezco de antemano la atención brindada y quedo atento a su respuesta.',
    cierre: 'Atentamente,',
    nombreFirma: 'NOMBRE DEL ESTUDIANTE Y FIRMA',
    ciFirma: '1234567890'
  };

  // GENERATOR FORM STATE
  const [genValues, setGenValues] = useState(defaultGenValues);

  const handleGenChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setGenValues({ ...genValues, [e.target.name]: e.target.value });
  };

  const clearForm = () => {
    setGenValues(defaultGenValues);
  };

  const buildBodyString = () => {
    return `Reciba un cordial saludo. Por la presente, Yo, ${genValues.nombresApellidos}, con C.I: ${genValues.ci} y código estudiantil ${genValues.codigoEstudiantil}, estudiante del ${genValues.numeroPao} de la carrera de ${genValues.carrera} correspondiente a la ${genValues.facultad}, solicito amablemente, ${genValues.descripcion || 'lo que se solicita.'}`;
  };

  const formattedLugarFecha = `${genValues.ciudadOficio}, ${new Date(genValues.fechaOficio + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  const downloadGeneratedPDF = () => {
    const blob = generatePreviewPDF({
      headerImgBase64: headerImg,
      footerImgBase64: footerImg,
      tituloAutoridad: genValues.tituloAutoridad === 'Otro' ? genValues.tituloAutoridadOtro : genValues.tituloAutoridad,
      nombreAutoridad: genValues.nombreAutoridad,
      cargo: genValues.cargoDestinatario,
      lugarFecha: formattedLugarFecha,
      cuerpo: buildBodyString(),
      studentName: genValues.nombreFirma,
      studentCI: genValues.ciFirma
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Oficio_${genValues.nombresApellidos.replace(/\s+/g, '_')}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtering & Sorting
  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.nombre.toLowerCase().includes(q) || f.id.toLowerCase().includes(q));
    }
    if (tipoFilter !== 'Todos') {
      result = result.filter(f => f.tipo === tipoFilter);
    }
    if (sortCol) {
      result.sort((a: any, b: any) => {
        const va = a[sortCol] || '';
        const vb = b[sortCol] || '';
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return result;
  }, [data, searchQuery, sortCol, sortAsc, tipoFilter]);

  const totalPages = Math.ceil(filteredData.length / perPage) || 1;
  const start = (currentPage - 1) * perPage;
  const pageData = filteredData.slice(start, start + perPage);



  const handleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleExportSelected = () => {
    const toExport = selectedIds.length > 0 ? data.filter(s => selectedIds.includes(s.id)) : filteredData;
    const csvContent = "ID,Nombre,Tipo,Fecha Creado,Tamanio,Estado\n" + 
      toExport.map(s => `${s.id},${s.nombre},${s.tipo},${s.fecha},${s.size},${s.estado}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelos_exportados.csv';
    a.click();
    URL.revokeObjectURL(url);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pageData.length) setSelectedIds([]);
    else setSelectedIds(pageData.map(f => f.id));
  };

  const saveModel = async () => {
    if (!genValues.nombreFormato.trim()) {
      alert("Por favor, ingrese un nombre para el formato/modelo antes de guardar.");
      return;
    }

    const descripcion = `Oficio para: ${genValues.descripcion.substring(0, 50)}...`;

    if (editingId) {
      // Actualizar modelo existente (persiste en Supabase)
      await updateFormato(editingId, {
        nombre: genValues.nombreFormato,
        descripcion,
        datos: { ...genValues },
      });
    } else {
      // Crear nuevo modelo (id y created_at los genera la BD)
      await addFormato({
        nombre: genValues.nombreFormato,
        tipo: 'DINAMICO',
        estado: 'activo',
        descripcion,
        datos: { ...genValues },
      });
    }
    setModalType(null);
    setEditingId(null);
  };

  // Redimensiona la imagen antes de guardarla: los sellos se usan a ~100px de alto
  // en el PDF, pero los archivos originales (1024px+) en Base64 revientan la cuota
  // de localStorage (~5MB) y el guardado fallaba en silencio.
  const resizeToDataURL = (file: File, maxDim: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });

  const handleDuplicate = async (format: any) => {
    await addFormato({
      nombre: `${format.nombre} (Copia)`,
      tipo: format.tipo,
      estado: format.estado,
      descripcion: format.descripcion,
      datos: format.data ?? null,
    });
  };

  const downloadFormat = (format: any) => {
    if (format.tipo === 'DINAMICO') {
      const gv = format.data || { ...defaultGenValues, nombreFormato: format.nombre };
      const blob = generatePreviewPDF({
        headerImgBase64: headerImg,
        footerImgBase64: footerImg,
        tituloAutoridad: gv.tituloAutoridad === 'Otro' ? gv.tituloAutoridadOtro : gv.tituloAutoridad,
        nombreAutoridad: gv.nombreAutoridad,
        cargo: gv.cargoDestinatario,
        lugarFecha: `${gv.ciudadOficio}, ${new Date(gv.fechaOficio + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        cuerpo: `Reciba un cordial saludo. Por la presente, Yo, ${gv.nombresApellidos}, con C.I: ${gv.ci} y código estudiantil ${gv.codigoEstudiantil}, estudiante del ${gv.numeroPao} de la carrera de ${gv.carrera} correspondiente a la ${gv.facultad}, solicito amablemente, ${gv.descripcion || 'lo que se solicita.'}`,
        studentName: gv.nombreFirma,
        studentCI: gv.ciFirma
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plantilla_${gv.nombreFormato.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert("Descarga de PDF estático no implementada en el demo.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
        {/* HERO SECTION */}
        <div className="w-full min-h-[92px] bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-4 border-b border-gray-800">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554774853-a50f402377ad?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
          
          <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
                <FileText className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[12px] font-extrabold text-white tracking-tight leading-none mb-1.5">
                  Modelos y Plantillas
                </h2>
                <p className="text-[11px] text-gray-400 font-medium">Gestione plantillas estáticas y genere oficios dinámicos.</p>
              </div>
            </div>
            <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">

              <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.total}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Total</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <FileEdit className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.dinamicos}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Dinámicos</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.estaticos}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">PDF</span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{kpi.activos}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Activos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* PANEL SPLIT */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0 relative bg-[#f4f7fb]/90 backdrop-blur-xl h-full animate-fade-in flex flex-col">
        <div className="flex-1 flex flex-row min-h-0 gap-6 relative">
        
        {/* PANEL IZQUIERDO */}
        <div className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative overflow-hidden flex-1 min-w-0 transition-all duration-300">
          <AcentoTarjeta />
        
        {/* TOOLBAR */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-6 shrink-0">
          <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap justify-center">
            <div className="relative w-[260px] shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar modelo o plantilla..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-white text-[13px] text-gray-700 rounded-xl py-2 pl-10 pr-4 outline-none border border-gray-200 focus:border-blue-500 transition-all font-medium placeholder:text-gray-400 shadow-sm" />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'Todos', label: 'Todos', count: kpi.total },
                { key: 'DINAMICO', label: 'Dinámicos', count: kpi.dinamicos },
                { key: 'PDF', label: 'PDF', count: kpi.estaticos }
              ].map(({ key, label, count }) => {
                const isActive = tipoFilter === key;
                return (
                  <button key={key} onClick={() => { setTipoFilter(key); setCurrentPage(1); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11.5px] font-bold border transition-all ${isActive ? 'bg-[#1e2733] text-white border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'}`}>
                    {label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${isActive ? 'bg-espoch-yellow text-gray-900' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                  </button>
                );
              })}
            </div>

            <button 
              onClick={() => { setSearchQuery(''); setTipoFilter('Todos'); setCurrentPage(1); }}
              className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium hover:text-gray-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar filtros
            </button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={handleExportSelected} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Exportar {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
            </button>
            <button onClick={() => setModalType('import')} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              <Upload className="w-3.5 h-3.5" /> Importar
            </button>
            <button onClick={() => setModalType('settings')} className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
              <Settings className="w-3.5 h-3.5" /> Logos y Sellos
            </button>
            <button onClick={() => { clearForm(); setEditingId(null); setModalType('create'); }} className="bg-[#0f172a] hover:bg-black text-white font-bold text-xs px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg transition-all border border-gray-800 xl:ml-2">
              <FileText className="w-3.5 h-3.5" /> Generador de Oficios
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="w-full overflow-auto flex-1 flex flex-col min-h-0 relative custom-scrollbar">
          <div className="min-w-[900px] grid grid-cols-[40px_1fr_100px_120px_100px_80px_100px] gap-4 px-4 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10 shrink-0">
            <div className="flex items-center justify-center"><input type="checkbox" checked={pageData.length > 0 && selectedIds.length === pageData.length} onChange={toggleSelectAll} className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('nombre')}>NOMBRE <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('tipo')}>TIPO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('fecha')}>FECHA CREADO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('size')}>TAMAÑO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700" onClick={() => handleSort('estado')}>ESTADO <ArrowUpDown className="w-3 h-3" /></div>
            <div className="text-right">ACCIONES</div>
          </div>
          
          <div className="flex flex-col min-w-[900px]">
            {pageData.map((f, i) => (
              <div 
                key={f.id} 
                onClick={() => setSelectedFormatForDetail(f)}
                className={`grid grid-cols-[40px_1fr_100px_120px_100px_80px_100px] gap-4 px-4 py-3 border-b border-gray-50 transition-colors items-center animate-fade-in cursor-pointer ${selectedIds.includes(f.id) || selectedFormatForDetail?.id === f.id ? 'bg-indigo-50/40' : 'hover:bg-gray-50/50'}`} 
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div 
                  className="flex items-center justify-center h-full w-full cursor-pointer" 
                  onClick={e => { 
                    e.stopPropagation(); 
                    toggleSelect(f.id); 
                    if (!selectedIds.includes(f.id)) setSelectedFormatForDetail(f); 
                    else if (selectedFormatForDetail?.id === f.id) setSelectedFormatForDetail(null); 
                  }}
                >
                  <input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => {}} className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow pointer-events-none" />
                </div>
                <div 
                  className="flex flex-col min-w-0 h-full justify-center w-full cursor-pointer" 
                  onClick={e => { 
                    e.stopPropagation(); 
                    toggleSelect(f.id); 
                    if (!selectedIds.includes(f.id)) setSelectedFormatForDetail(f); 
                    else if (selectedFormatForDetail?.id === f.id) setSelectedFormatForDetail(null); 
                  }}
                >
                  <span className="text-[13px] font-bold text-gray-900 truncate">{f.nombre}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{f.id}</span>
                </div>
                <div><span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${f.tipo === 'DINAMICO' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{f.tipo}</span></div>
                <div className="text-[11px] text-gray-500 font-medium">{new Date(f.fecha).toLocaleDateString('es-ES')}</div>
                <div className="text-[11px] text-gray-500 font-medium">{f.size}</div>
                <div><span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full border flex items-center gap-1 w-max bg-green-50 text-green-600 border-green-200/50`}><span className={`w-1.5 h-1.5 rounded-full bg-green-500`}></span>Activo</span></div>
                <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { 
                    setSelectedFmt(f); 
                    if (f.tipo === 'DINAMICO') {
                      setGenValues(f.data || { ...defaultGenValues, nombreFormato: f.nombre });
                      setEditingId(f.id);
                      setModalType('create');
                    } else {
                      setModalType('edit'); 
                    }
                  }} className="w-7 h-7 flex items-center justify-center rounded-md bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setSelectedFmt(f); setModalType('delete'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onChange={setCurrentPage}
          total={filteredData.length}
          perPage={perPage}
          onPerPageChange={setPerPage}
          className="pt-4 border-t border-gray-100/60"
        />
      </div>
        
      {/* PANEL DERECHO (Detalle del modelo) */}
      {(selectedFormatForDetail && selectedIds.length <= 1) && (
          <div className="w-1/4 min-w-[300px] bg-white rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative shrink-0 overflow-hidden animate-fade-in z-10">
            <button onClick={() => setSelectedFormatForDetail(null)} className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">Detalle del modelo</p>
            <h2 className="text-sm font-bold text-gray-900 leading-tight mb-1">{selectedFormatForDetail.nombre}</h2>
            <p className="text-[10px] text-gray-400 font-mono mb-4">{selectedFormatForDetail.id}</p>

            <div className="w-full flex-1 bg-white rounded-xl border border-gray-200 flex flex-col mb-6 relative overflow-hidden shadow-sm p-3 min-h-0">
              {selectedFormatForDetail.tipo === 'DINAMICO' ? (
                <div className="w-full h-full bg-white p-5 overflow-y-auto text-[10px] leading-[1.5] text-gray-800 border border-gray-100 shadow-inner rounded-sm custom-scrollbar relative z-10 pointer-events-auto">
                  {/* Real HTML Preview */}
                  <div className="flex justify-between items-center border-b border-gray-300 pb-3 mb-4">
                    <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded">
                      {headerImg ? <img src={headerImg} className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-5 h-5 text-gray-300"/>}
                    </div>
                    <div className="text-center flex-1 px-2">
                      <div className="font-bold text-[12px]">ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO</div>
                      <div className="text-[10px] uppercase">{(selectedFormatForDetail.data?.facultad || 'FACULTAD DE INFORMÁTICA Y ELECTRÓNICA')}</div>
                    </div>
                    <div className="w-10 h-10 bg-gray-100 flex items-center justify-center rounded">
                      {headerImg ? <img src={headerImg} className="max-w-full max-h-full object-contain" /> : <ImageIcon className="w-5 h-5 text-gray-300"/>}
                    </div>
                  </div>
                  
                  <div className="text-right mb-6">
                    {selectedFormatForDetail.data?.ciudadOficio || 'Riobamba'}, {new Date((selectedFormatForDetail.data?.fechaOficio || new Date().toISOString().split('T')[0]) + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>

                  <div className="mb-6">
                    <div>{(selectedFormatForDetail.data?.tituloAutoridad === 'Otro' ? selectedFormatForDetail.data?.tituloAutoridadOtro : selectedFormatForDetail.data?.tituloAutoridad) || 'Ing.'} {selectedFormatForDetail.data?.nombreAutoridad || 'NOMBRE DE LA AUTORIDAD'}</div>
                    <div className="font-bold">{selectedFormatForDetail.data?.cargoDestinatario || 'CARGO'}</div>
                    <div>{selectedFormatForDetail.data?.enSuDespacho || 'En su despacho,'}</div>
                  </div>

                  <div className="text-justify mb-6 opacity-90">
                    Reciba un cordial saludo. Por la presente, Yo, <strong>{selectedFormatForDetail.data?.nombresApellidos || 'NOMBRES Y APELLIDOS'}</strong>, con C.I: <strong>{selectedFormatForDetail.data?.ci || '1234567890'}</strong> y código estudiantil <strong>{selectedFormatForDetail.data?.codigoEstudiantil || '123'}</strong>, estudiante del <strong>{selectedFormatForDetail.data?.numeroPao || 'PAO 1'}</strong> de la carrera de <strong>{selectedFormatForDetail.data?.carrera || 'CARRERA'}</strong> correspondiente a la <strong>{selectedFormatForDetail.data?.facultad || 'FACULTAD'}</strong>, solicito amablemente, {selectedFormatForDetail.data?.descripcion || 'lo que se solicita.'}
                  </div>

                  <div className="mb-8">{selectedFormatForDetail.data?.despedida || 'Agradezco de antemano la atención brindada.'}</div>

                  <div className="mt-10 text-center">
                    <div className="mb-6">{selectedFormatForDetail.data?.cierre || 'Atentamente,'}</div>
                    <div className="w-32 border-b border-gray-800 mx-auto mb-1.5"></div>
                    <div className="font-bold">{selectedFormatForDetail.data?.nombreFirma || 'NOMBRE DEL ESTUDIANTE'}</div>
                    <div>C.I: {selectedFormatForDetail.data?.ciFirma || '1234567890'}</div>
                  </div>
                  
                  {footerImg && (
                    <div className="mt-8 border-t border-gray-300 pt-2 flex justify-center">
                      <img src={footerImg} className="h-6 object-contain" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center relative bg-gray-50/50 rounded-lg z-10">
                  <FileText className="w-12 h-12 text-red-300 mb-2" strokeWidth={1.5} />
                  <span className="text-[9px] font-bold text-red-500 tracking-widest bg-red-50 px-2 py-0.5 rounded-md border border-red-100">PDF ESTATICO</span>
                  <span className="text-[8px] text-gray-400 mt-2 text-center px-4">Esta plantilla es un documento estático subido al sistema.</span>
                </div>
              )}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/10 pointer-events-none rounded-xl"></div>
            </div>

            <div className="flex items-center gap-2 mt-auto shrink-0">
               <button 
                  onClick={() => {
                    setSelectedFmt(selectedFormatForDetail);
                    if (selectedFormatForDetail.tipo === 'DINAMICO') {
                      setGenValues(selectedFormatForDetail.data || { ...defaultGenValues, nombreFormato: selectedFormatForDetail.nombre });
                      setEditingId(selectedFormatForDetail.id);
                      setModalType('create');
                    } else {
                      setModalType('edit');
                    }
                  }} 
                  className="flex-1 bg-[#0f172a] hover:bg-black text-white text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
               >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
               </button>
               <button onClick={() => handleDuplicate(selectedFormatForDetail)} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
                  <Layers className="w-3.5 h-3.5" /> Duplicar
               </button>
            </div>
            <button onClick={() => downloadFormat(selectedFormatForDetail)} className="w-full mt-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[11px] font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5" /> Descargar Plantilla
            </button>
          </div>
        )}
      </div>

      {/* MODALS */}
      {modalType && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in overflow-hidden">
          
          {/* GENERADOR DE OFICIOS (FULL SCREEN MODAL) */}
          {modalType === 'create' && (
            <div className="bg-[#f8fafc] rounded-xl shadow-2xl w-full h-full max-w-[1400px] max-h-[95vh] flex flex-col relative animate-scale-in border border-gray-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-xl shrink-0">
                <h2 className="text-xl font-bold text-[#0f172a]">{editingId ? 'Editar Modelo de Oficio' : 'Generador de Modelos de Oficio'}</h2>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600 p-1 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto p-6 bg-white border-r border-gray-200 custom-scrollbar">
                  <div className="max-w-[600px] mx-auto flex flex-col gap-4 pb-20">
                    <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-gray-900 select-none hover:bg-gray-50">
                        <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" /> 1. Datos del Oficio</div>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-4 border-t border-gray-100 flex flex-col gap-4 bg-gray-50/50">
                        <div className="flex flex-col gap-1.5 mb-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <label className="text-[10px] font-bold text-blue-800">Nombre para guardar esta plantilla / modelo *</label>
                          <input name="nombreFormato" value={genValues.nombreFormato} onChange={handleGenChange} placeholder="Ej. Oficio de retiro de carrera" className="text-xs p-2.5 border border-blue-200 rounded-lg outline-none focus:border-blue-400 bg-white text-blue-900 font-bold" />
                        </div>
                        <div className="grid grid-cols-[1fr_150px] gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-600">Ciudad *</label>
                            <input name="ciudadOficio" value={genValues.ciudadOficio} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-600">Fecha *</label>
                            <input type="date" name="fechaOficio" value={genValues.fechaOficio} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white cursor-pointer" />
                          </div>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-600">Título</label>
                            <select name="tituloAutoridad" value={genValues.tituloAutoridad} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white cursor-pointer">
                              <option value="Ing.">Ing.</option>
                              <option value="Phd.">Phd.</option>
                              <option value="Otro">Otro</option>
                            </select>
                            {genValues.tituloAutoridad === 'Otro' && (
                              <input 
                                name="tituloAutoridadOtro" 
                                value={genValues.tituloAutoridadOtro} 
                                onChange={handleGenChange} 
                                placeholder="Especifique..."
                                className="mt-1 text-xs p-2.5 border border-blue-200 rounded-lg outline-none focus:border-blue-400 bg-blue-50 text-blue-900 animate-fade-in" 
                              />
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-gray-600">Nombre Autoridad *</label>
                            <input type="text" name="nombreAutoridad" value={genValues.nombreAutoridad} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" placeholder="Ej. Juan Pérez" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Cargo destinatario *</label>
                          <select name="cargoDestinatario" value={genValues.cargoDestinatario} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white cursor-pointer">
                            <option value="DECANO">DECANO</option>
                            <option value="DIRECTOR DE LA CARRERA DE ELECTRICIDAD">DIRECTOR DE LA CARRERA DE ELECTRICIDAD</option>
                            <option value="COORDINADOR ACADÉMICO">COORDINADOR ACADÉMICO</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">En su despacho</label>
                          <input name="enSuDespacho" value={genValues.enSuDespacho} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                      </div>
                    </details>
                    <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-gray-900 select-none hover:bg-gray-50">
                        <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-500" /> 2. Datos del Estudiante</div>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Nombres y apellidos *</label>
                          <input name="nombresApellidos" value={genValues.nombresApellidos} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">C.I. *</label>
                          <input name="ci" value={genValues.ci} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Código estudiantil *</label>
                          <input name="codigoEstudiantil" value={genValues.codigoEstudiantil} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Número de PAO *</label>
                          <select name="numeroPao" value={genValues.numeroPao} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white cursor-pointer">
                            {[1,2,3,4,5,6,7,8,9].map(num => (
                              <option key={num} value={`PAO ${num}`}>PAO {num}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Carrera *</label>
                          <input name="carrera" value={genValues.carrera} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Facultad *</label>
                          <input name="facultad" value={genValues.facultad} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                      </div>
                    </details>
                    <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-gray-900 select-none hover:bg-gray-50">
                        <div className="flex items-center gap-2"><FileEdit className="w-4 h-4 text-gray-500" /> 3. Detalles de la Solicitud</div>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-4 border-t border-gray-100 flex flex-col gap-4 bg-gray-50/50">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Descripción de la solicitud *</label>
                          <textarea name="descripcion" value={genValues.descripcion} onChange={handleGenChange} rows={3} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white resize-none"></textarea>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Despedida *</label>
                          <input name="despedida" value={genValues.despedida} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Cierre *</label>
                          <input name="cierre" value={genValues.cierre} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                      </div>
                    </details>
                    <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden" open>
                      <summary className="flex items-center justify-between p-4 cursor-pointer font-bold text-gray-900 select-none hover:bg-gray-50">
                        <div className="flex items-center gap-2"><PenTool className="w-4 h-4 text-gray-500" /> 4. Firma del Estudiante</div>
                        <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">Nombre para la firma *</label>
                          <input name="nombreFirma" value={genValues.nombreFirma} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-gray-600">C.I. para la firma *</label>
                          <input name="ciFirma" value={genValues.ciFirma} onChange={handleGenChange} className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
                        </div>
                      </div>
                    </details>
                  </div>
                </div>

                <div className="flex-1 bg-[#f1f5f9] p-6 lg:p-10 flex flex-col items-center overflow-y-auto custom-scrollbar relative">
                  <div className="w-full max-w-[700px] flex justify-between items-center mb-4">
                    <h4 className="font-extrabold text-sm text-gray-700">Vista Previa del Documento</h4>
                    <button onClick={downloadGeneratedPDF} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-sm transition-colors">
                      <Download className="w-3.5 h-3.5" /> Descargar
                    </button>
                  </div>
                  <div className="w-full max-w-[700px] aspect-[1/1.414] bg-white shadow-xl relative p-12 lg:p-16 text-[13px] text-gray-900 font-serif leading-relaxed">
                    {headerImg && <img src={headerImg} alt="Header" className="absolute top-0 left-6 h-[100px] w-auto object-contain object-left-top" />}
                    {footerImg && <img src={footerImg} alt="Footer" className="absolute bottom-6 left-6 right-6 h-[50px] w-[calc(100%-48px)] object-contain object-bottom" />}
                    <div className="text-right mb-12">{formattedLugarFecha}</div>
                    <div className="mb-10 leading-tight">
                      <p>{genValues.tituloAutoridad === 'Otro' ? genValues.tituloAutoridadOtro : genValues.tituloAutoridad}</p>
                      <p>{genValues.nombreAutoridad.toUpperCase()}</p>
                      <p className="font-bold">{genValues.cargoDestinatario.toUpperCase()}</p>
                      <p>{genValues.enSuDespacho}</p>
                    </div>
                    <div className="mb-6">De mi consideración:</div>
                    <div className="text-justify whitespace-pre-wrap flex-1 mb-8 leading-[1.5]">{buildBodyString()}</div>
                    <div className="mt-8">
                      <p>{genValues.despedida}</p>
                      <p className="mt-6">{genValues.cierre}</p>
                    </div>
                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 text-center text-xs">
                      <p>_________________________________</p>
                      <p className="font-bold mt-1">{genValues.nombreFirma}</p>
                      <p className="font-bold">C.I: {genValues.ciFirma}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 flex justify-between items-center z-10 rounded-bl-xl rounded-br-xl shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                <button onClick={clearForm} className="px-5 py-2.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Limpiar campos
                </button>
                <button onClick={saveModel} className="bg-[#0f172a] hover:bg-black text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> {editingId ? 'Actualizar Modelo' : 'Guardar Modelo'}
                </button>
              </div>
            </div>
          )}

          {modalType === 'settings' && (
            <div className="bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[500px] relative animate-scale-in">
              <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors bg-transparent p-1 z-10"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">Logos y Sellos Oficiales</h3>
              <p className="text-xs text-gray-500 mb-6">Suba las imágenes institucionales para el motor de PDFs.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const hFile = fd.get('header') as File;
                const fFile = fd.get('footer') as File;
                try {
                  let hBase64 = headerImg;
                  let fBase64 = footerImg;
                  if (hFile.size > 0) hBase64 = await resizeToDataURL(hFile, 600);
                  if (fFile.size > 0) fBase64 = await resizeToDataURL(fFile, 1200);
                  saveSettings(hBase64, fBase64);
                  setModalType(null);
                } catch (err: any) {
                  const Swal = (await import('sweetalert2')).default;
                  const esCuota = /quota|exceeded/i.test(err?.name || '') || /quota|exceeded/i.test(err?.message || '');
                  Swal.fire({
                    icon: 'error',
                    title: 'No se pudieron guardar las imágenes',
                    text: esCuota
                      ? 'Las imágenes ocupan demasiado espacio en el navegador. Usa archivos más livianos (PNG/JPG pequeños).'
                      : (err?.message || 'Error desconocido al procesar la imagen.'),
                    confirmButtonColor: '#b00000',
                  });
                }
              }} className="flex flex-col gap-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">1. Sello Superior (Franja Izquierda)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex items-center gap-4 bg-gray-50">
                    {headerImg ? <img src={headerImg} alt="Header" className="h-16 object-contain rounded" /> : <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-400"/></div>}
                    <input type="file" name="header" accept="image/*" className="text-xs w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">2. Pie de Página Institucional</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col gap-4 bg-gray-50">
                    {footerImg ? <img src={footerImg} alt="Footer" className="h-10 w-full object-contain rounded" /> : <div className="w-full h-10 bg-gray-200 rounded flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-400"/></div>}
                    <input type="file" name="footer" accept="image/*" className="text-xs w-full" />
                  </div>
                </div>
                <div className="flex gap-3 mt-2 justify-end">
                  <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                  <button type="submit" className="bg-[#0f172a] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all border border-gray-800">Guardar Imágenes</button>
                </div>
              </form>
            </div>
          )}

          {modalType === 'edit' && selectedFmt && (
            <div className="bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[400px] relative animate-scale-in">
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">Editar Modelo</h3>
              <p className="text-xs text-gray-500 mb-6">Modifica los detalles del modelo o plantilla.</p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                await updateFormato(selectedFmt.id, {
                  nombre: fd.get('nombre') as string,
                  descripcion: fd.get('descripcion') as string,
                  estado: fd.get('estado') as string,
                });
                setModalType(null);
              }} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nombre del Formato</label>
                  <input name="nombre" defaultValue={selectedFmt.nombre} required className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-blue-400 font-medium" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Descripción</label>
                  <textarea name="descripcion" defaultValue={selectedFmt.descripcion} required rows={3} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-blue-400 font-medium resize-none"></textarea>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estado</label>
                  <select name="estado" defaultValue={selectedFmt.estado} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-blue-400 font-medium cursor-pointer">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-4 justify-end">
                  <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                  <button type="submit" className="bg-[#0f172a] hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all border border-gray-800">Guardar Cambios</button>
                </div>
              </form>
            </div>
          )}

          {modalType === 'import' && (
            <div className="bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[400px] relative animate-scale-in text-center">
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">Importar Modelos</h3>
              <p className="text-xs text-gray-500 mb-6">Cargue un archivo CSV con nuevos modelos o plantillas.</p>
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center hover:border-espoch-yellow/50 transition-colors cursor-pointer relative" onClick={() => document.getElementById('import-input')?.click()}>
                <UploadCloud className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-sm font-bold text-gray-600">Haga clic o arrastre un archivo</p>
                <p className="text-[10px] text-gray-400 mt-1">Formatos: CSV (.csv)</p>
                <input type="file" id="import-input" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { alert('Archivo simulado: ' + e.target.files[0].name); setModalType(null); } }} />
              </div>
              <div className="flex items-center justify-between mt-6">
                <button type="button" className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 underline underline-offset-2">
                  <FileDown className="w-3.5 h-3.5" /> Descargar formato de ejemplo
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {(modalType === 'delete' || modalType === 'bulkDelete') && (
            <div className="bg-white rounded-[20px] p-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[420px] relative animate-scale-in text-center py-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-[18px] font-extrabold text-gray-900 mb-2">Eliminar Modelo</h3>
              <p className="text-[13px] text-gray-500 mb-7 leading-relaxed">
                {modalType === 'bulkDelete' 
                  ? `Se eliminarán permanentemente los ${selectedIds.length} modelos seleccionados.`
                  : `¿Está seguro que desea eliminar "${selectedFmt?.nombre}" permanentemente?`}
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setModalType(null)} className="flex-1 py-3 rounded-xl border border-gray-200 bg-white font-bold text-[13px] text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={async () => {
                  if (modalType === 'bulkDelete') { await Promise.all(selectedIds.map(id => removeFormato(id))); setSelectedIds([]); }
                  else { await removeFormato(selectedFmt.id); }
                  setModalType(null);
                }} className="flex-1 py-3 rounded-xl border border-transparent bg-espoch-red hover:bg-espoch-darkred text-white font-bold text-[13px] shadow-[0_0_12px_rgba(176,0,0,0.4)] transition-colors">Confirmar</button>
              </div>
            </div>
          )}

        </div>
      )}
        </div>
    </div>
  );
};
