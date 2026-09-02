import { useState, useMemo } from 'react';
import { Library, Search, ChevronDown, LayoutGrid, List, Download, ExternalLink, BookOpen, MonitorPlay, Book, Plus, X, Upload, Save, Edit2, Trash2, UploadCloud, FileText } from 'lucide-react';
import { useRecursosStore } from '../../../store/recursosStore';
import { materiasData } from '../data/academicoData';

// Catálogo de materias de la malla (únicas, ordenadas) para asociar recursos
const materiaCatalogo = Array.from(new Set(materiasData.map(m => m.nombre))).sort((a, b) => a.localeCompare(b));

export const Recursos = () => {
  const recursos = useRecursosStore(state => state.recursos);
  const addRecurso = useRecursosStore(state => state.addRecurso);
  const removeRecurso = useRecursosStore(state => state.removeRecurso);
  const [search, setSearch] = useState('');

  const mappedRecursos = useMemo(() => recursos.map(r => ({
    ...r,
    portada: r.portada_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300&h=400',
    size: r.size_desc || '',
    materia: 'Materia Asignada', // Mock for now
    tipoApp: 'General', // Mock for now
    link: '#', // Mock
    edicion: '1ra Edición' // Mock
  })), [recursos]);
  
  // Filters
  const [tipoFilters, setTipoFilters] = useState<string[]>([]);
  const [formatoFilters, setFormatoFilters] = useState<string[]>([]);
  const [materiaFilters, setMateriaFilters] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('name-asc');
  
  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRecurso, setNewRecurso] = useState({
    tipo: 'libro',
    titulo: '',
    autor: '',
    materia: '',
    descripcion: '',
    tipoApp: '',
    formato: '',
    size: '',
    link: '',
    portada: ''
  });

  const filteredItems = useMemo(() => {
    let items = [...mappedRecursos];

    if (tipoFilters.length > 0) {
      items = items.filter(i => tipoFilters.includes(i.tipo));
    }

    if (formatoFilters.length > 0) {
      items = items.filter(i => formatoFilters.includes(i.formato));
    }

    if (materiaFilters.length > 0) {
      items = items.filter(i => {
        if (i.tipo === 'libro') return materiaFilters.includes(i.materia!);
        if (i.tipo === 'software') return materiaFilters.includes(i.tipoApp!);
        return false;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.titulo.toLowerCase().includes(q) || (i.autor && i.autor.toLowerCase().includes(q)) || (i.descripcion && i.descripcion.toLowerCase().includes(q)));
    }

    if (sortOrder === 'name-asc') items.sort((a, b) => a.titulo.localeCompare(b.titulo));
    if (sortOrder === 'name-desc') items.sort((a, b) => b.titulo.localeCompare(a.titulo));

    return items;
  }, [mappedRecursos, tipoFilters, formatoFilters, materiaFilters, search, sortOrder]);

  const toggleFilter = (setFilter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setFilter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const getCategoryIcon = (tipo: string) => {
    return tipo === 'libro' ? <BookOpen className="w-3.5 h-3.5" /> : <MonitorPlay className="w-3.5 h-3.5" />;
  };

  const getCategoryLabel = (tipo: string) => {
    return tipo === 'libro' ? 'Libro' : 'Software';
  };

  const getCategoryColor = (tipo: string) => {
    return tipo === 'libro' ? 'text-amber-600' : 'text-blue-600';
  };

  // Extraer opciones para filtros
  const materiasUnicas = Array.from(new Set(mappedRecursos.filter(r => r.tipo === 'libro').map(r => r.materia!)));
  const areasUnicas = Array.from(new Set(mappedRecursos.filter(r => r.tipo === 'software').map(r => r.tipoApp!)));
  const combinedCategorias = [...materiasUnicas, ...areasUnicas];
  const formatosUnicos = Array.from(new Set(mappedRecursos.map(r => r.formato)));

  const handleGuardarRecurso = () => {
    if (!newRecurso.titulo.trim()) return;
    const tipo = newRecurso.tipo as 'libro' | 'software';
    addRecurso({
      tipo,
      titulo: newRecurso.titulo,
      portada_url: newRecurso.portada || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300&h=400',
      formato: newRecurso.formato || (tipo === 'libro' ? 'PDF' : 'App'),
      size_desc: newRecurso.size || (tipo === 'libro' ? 'PDF' : 'Local'),
      autor: tipo === 'libro' ? newRecurso.autor : undefined,
      descripcion: tipo === 'software' ? newRecurso.descripcion : undefined,
    });
    setNewRecurso({ tipo: 'libro', titulo: '', autor: '', materia: '', descripcion: '', tipoApp: '', formato: '', size: '', link: '', portada: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex min-h-0 relative overflow-hidden h-full">
      {/* MODAL NUEVO RECURSO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col relative z-10 overflow-hidden animate-fade-in max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-espoch-red flex items-center justify-center text-white shadow-sm">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">Nuevo Recurso</h2>
                  <p className="text-xs text-gray-500 font-medium">Añade un libro o software a la biblioteca</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5">
              
              {/* File Upload / Auto-fill banner */}
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 hover:border-espoch-red/40 transition-colors cursor-pointer group">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6 text-gray-400 group-hover:text-espoch-red transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-gray-700 mb-1">Cargar archivo principal</h3>
                <p className="text-[11px] text-gray-500 text-center max-w-sm">Sube un PDF, instalador o enlace. Los metadatos (título, autor, formato) se detectarán y completarán automáticamente.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Tipo de Recurso</label>
                  <select 
                    value={newRecurso.tipo}
                    onChange={(e) => setNewRecurso({...newRecurso, tipo: e.target.value})}
                    className="bg-white text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:ring-2 focus:ring-espoch-yellow/20 font-semibold appearance-none transition-all shadow-sm"
                  >
                    <option value="libro">Libro</option>
                    <option value="software">Software / Programa</option>
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Título / Nombre *</label>
                  <input type="text" value={newRecurso.titulo} onChange={e => setNewRecurso({...newRecurso, titulo: e.target.value})} className="bg-white text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:ring-2 focus:ring-espoch-yellow/20 font-semibold transition-all shadow-sm" placeholder="Ej: Fundamentos de Redes" />
                </div>
              </div>

              {newRecurso.tipo === 'libro' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Autor(es)</label>
                      <input type="text" value={newRecurso.autor} onChange={e => setNewRecurso({...newRecurso, autor: e.target.value})} className="bg-white text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:ring-2 focus:ring-espoch-yellow/20 font-semibold transition-all shadow-sm" placeholder="Ej: Kurose, Ross" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Materia Asociada</label>
                      <select value={newRecurso.materia} onChange={e => setNewRecurso({...newRecurso, materia: e.target.value})} className="bg-white text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:ring-2 focus:ring-espoch-yellow/20 font-semibold transition-all shadow-sm cursor-pointer">
                        <option value="">Seleccione materia...</option>
                        {materiaCatalogo.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Área / Tipo App</label>
                      <input type="text" value={newRecurso.tipoApp} onChange={e => setNewRecurso({...newRecurso, tipoApp: e.target.value})} className="bg-white text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:ring-2 focus:ring-espoch-yellow/20 font-semibold transition-all shadow-sm" placeholder="Ej: Simulación" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Enlace de Descarga / Web</label>
                      <input type="text" value={newRecurso.link} onChange={e => setNewRecurso({...newRecurso, link: e.target.value})} className="bg-white text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:ring-2 focus:ring-espoch-yellow/20 font-semibold transition-all shadow-sm" placeholder="https://" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Descripción</label>
                    <textarea value={newRecurso.descripcion} onChange={e => setNewRecurso({...newRecurso, descripcion: e.target.value})} rows={2} className="bg-white text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:ring-2 focus:ring-espoch-yellow/20 font-semibold transition-all shadow-sm resize-none" placeholder="Breve descripción de la herramienta..."></textarea>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Formato</label>
                <input type="text" value={newRecurso.formato} onChange={e => setNewRecurso({...newRecurso, formato: e.target.value})} className="bg-white text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:ring-2 focus:ring-espoch-yellow/20 font-semibold transition-all shadow-sm" placeholder="Ej: PDF, App, Físico" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Portada o Icono (URL)</label>
                <div className="flex items-center gap-3">
                  <input type="text" value={newRecurso.portada} onChange={e => setNewRecurso({...newRecurso, portada: e.target.value})} className="flex-1 bg-white text-[13px] text-gray-800 rounded-xl py-3 px-4 outline-none border border-gray-200 focus:border-espoch-yellow focus:ring-2 focus:ring-espoch-yellow/20 font-semibold transition-all shadow-sm" placeholder="https://..." />
                  <button className="w-11 h-11 shrink-0 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors border border-gray-200 shadow-sm" title="Subir imagen">
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-gray-600 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button onClick={handleGuardarRecurso} className="px-6 py-2.5 rounded-xl bg-[#0f172a] hover:bg-black text-white text-[13px] font-bold shadow-lg transition-all flex items-center gap-2 border border-gray-800">
                <Save className="w-4 h-4" /> Guardar Recurso
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 bg-[#f4f7fb]">
        
        {/* HERO SECTION - BANNER UPDATE */}
        <div className="w-full min-h-[120px] bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
          
          <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
                <Library className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[28px] md:text-[34px] font-bold text-white tracking-tight leading-none mb-1.5">
                  Recursos y Materiales
                </h2>
                <p className="text-[13px] text-gray-400 font-medium">Explora, filtra y descarga libros o software para tu carrera.</p>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{recursos.length}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Total recursos</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>
              
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{recursos.filter(r => r.tipo === 'libro').length}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Libros</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <MonitorPlay className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-white leading-tight">{recursos.filter(r => r.tipo === 'software').length}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Software</span>
                </div>
              </div>
            </div>


          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 flex w-full p-6 lg:p-10 gap-8 items-start overflow-hidden">
          
          {/* SIDEBAR FILTROS */}
          <aside className="w-[240px] shrink-0 hidden lg:flex flex-col gap-6 bg-white/70 backdrop-blur-xl border border-gray-200/60 shadow-sm rounded-2xl p-5 h-full overflow-y-auto custom-scrollbar">
            
            {/* Tipo de Recurso */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Tipo</h3>
              </div>
              <div className="flex flex-col gap-3">
                {['libro', 'software'].map(tipo => (
                  <label key={tipo} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="peer sr-only" checked={tipoFilters.includes(tipo)} onChange={() => toggleFilter(setTipoFilters, tipo)} />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shadow-sm shrink-0 ${tipoFilters.includes(tipo) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300'}`}>
                      {tipoFilters.includes(tipo) && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                    </div>
                    <span className="text-[13.5px] font-semibold text-gray-600 group-hover:text-gray-900 capitalize">{tipo === 'libro' ? 'Libros' : 'Software'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Formato */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Formato</h3>
              </div>
              <div className="flex flex-col gap-3">
                {formatosUnicos.map(formato => (
                  <label key={formato} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="peer sr-only" checked={formatoFilters.includes(formato)} onChange={() => toggleFilter(setFormatoFilters, formato)} />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shadow-sm shrink-0 ${formatoFilters.includes(formato) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300'}`}>
                      {formatoFilters.includes(formato) && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                    </div>
                    <span className="text-[13.5px] font-semibold text-gray-600 group-hover:text-gray-900">{formato}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Categorías / Áreas */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider">Área / Materia</h3>
              </div>
              <div className="flex flex-col gap-3">
                {combinedCategorias.map(cat => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="peer sr-only" checked={materiaFilters.includes(cat)} onChange={() => toggleFilter(setMateriaFilters, cat)} />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shadow-sm shrink-0 ${materiaFilters.includes(cat) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300'}`}>
                      {materiaFilters.includes(cat) && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                    </div>
                    <span className="text-[13.5px] font-semibold text-gray-600 group-hover:text-gray-900 leading-tight">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT CONTENT (GRID) */}
          <div className="flex-1 flex flex-col min-w-0 gap-5 h-full overflow-hidden">
            
            {/* Top Action Bar */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white/70 backdrop-blur-xl rounded-[20px] p-2.5 border border-gray-200/60 shadow-sm shrink-0 w-full justify-start">
              <div className="relative w-full md:w-[260px] mr-auto shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar recursos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white text-[12px] text-gray-700 rounded-full py-2.5 pl-9 pr-4 outline-none border border-gray-200 focus:border-gray-300 focus:shadow-md transition-all font-medium placeholder:text-gray-400" 
                />
              </div>
              
              <div className="flex items-center gap-4 shrink-0">
                <div className="relative hidden sm:block shrink-0">
                  <select 
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 text-gray-600 text-[12px] font-bold py-2.5 pl-4 pr-8 rounded-full outline-none focus:border-gray-300 focus:shadow-md transition-all cursor-pointer"
                  >
                    <option value="name-asc">Alfabéticamente, A-Z</option>
                    <option value="name-desc">Alfabéticamente, Z-A</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>

                <div className="hidden sm:block w-px h-6 bg-gray-200 shrink-0"></div>
                
                <span className="hidden sm:block text-[12px] font-extrabold text-gray-500 uppercase tracking-wider shrink-0">{filteredItems.length} RECURSOS</span>
                
                <div className="hidden sm:flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shrink-0">
                  <button onClick={() => setViewMode('grid')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <div className="hidden sm:block w-px h-6 bg-gray-200 shrink-0 ml-2"></div>

                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] hover:bg-black text-white text-[12px] font-bold rounded-full transition-all shadow-lg border border-gray-800 shrink-0 ml-1"
                >
                  <Plus className="w-4 h-4" /> Nuevo Recurso
                </button>
              </div>
            </div>

            {/* The Grid / List */}
            <div className="flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
                : "flex flex-col gap-3"}>
                {filteredItems.map((item) => {
                  if (viewMode === 'list') {
                    // List View Item
                    return (
                      <div key={item.id} className="flex items-center gap-4 bg-white rounded-2xl p-3 border border-gray-200 shadow-sm hover:shadow-md transition-all">
                        <img src={item.portada} className="w-20 h-20 rounded-xl object-cover shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[14px] font-extrabold text-gray-900 mb-1 truncate">{item.titulo}</h3>
                          <p className="text-[11px] font-medium text-gray-500 mb-1">{item.tipo === 'libro' ? item.autor : item.descripcion}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                              {item.tipo === 'libro' ? item.materia : item.tipoApp}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500 bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">
                              {item.formato}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pr-2">
                          <button className="w-9 h-9 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-center transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeRecurso(item.id)} className="w-9 h-9 rounded-xl border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition-colors mr-2">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <a href={item.link} className="flex items-center gap-2 px-4 py-2.5 bg-espoch-red hover:bg-espoch-darkred text-white text-[12px] font-extrabold rounded-xl transition-all shadow-sm hover:shadow-md">
                            {item.tipo === 'libro' ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                            {item.tipo === 'libro' ? 'Descargar' : 'Visitar'}
                          </a>
                        </div>
                      </div>
                    );
                  }

                  // Grid View Item
                  return (
                    <div key={item.id} className="group relative rounded-[20px] shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] transition-all duration-300 overflow-hidden flex flex-col h-[280px] bg-[#1a1f26]">
                      {/* Full Background Image */}
                      <img src={item.portada} alt={item.titulo} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
                        <div className="flex flex-col gap-2">
                          <div className={`bg-white ${getCategoryColor(item.tipo)} text-[9px] font-extrabold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5`}>
                            {getCategoryIcon(item.tipo)}
                            {getCategoryLabel(item.tipo)}
                          </div>
                          <div className="bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-2.5 py-1 rounded-full shadow-sm border border-white/10 w-fit">
                            {item.formato}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-lg">
                          <button className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => removeRecurso(item.id)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Contenido Inferior (Glassmorphism) */}
                      <div className="absolute bottom-2 left-2 right-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex flex-col z-10 text-white shadow-lg">
                        <h3 className="text-[12px] font-extrabold leading-tight mb-1 line-clamp-2">{item.titulo}</h3>
                        
                        <div className="flex items-center justify-between mt-1 mb-3">
                          <p className="text-[9px] font-medium text-gray-200 flex items-center gap-1 truncate max-w-[60%]">
                            <Book className="w-3 h-3 shrink-0" /> <span className="truncate">{item.tipo === 'libro' ? item.materia : item.tipoApp}</span>
                          </p>
                          <p className="text-[8px] font-mono text-gray-300 bg-black/40 px-1 py-0.5 rounded text-right tracking-wider shrink-0">{item.size}</p>
                        </div>

                        {/* Botón Acción */}
                        <div className="flex items-center justify-between gap-2 mt-auto">
                           <a href={item.link || '#'} className="w-full h-[32px] bg-white hover:bg-espoch-red hover:text-white hover:border-transparent text-gray-900 text-[10px] font-extrabold rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 border border-transparent">
                             {item.tipo === 'libro' ? <Download className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />} 
                             {item.tipo === 'libro' ? 'Descargar' : 'Visitar Enlace'}
                           </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
