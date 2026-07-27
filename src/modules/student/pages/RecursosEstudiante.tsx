import { useState, useMemo, useEffect } from 'react';
import { BookOpen, MonitorPlay, Search, ChevronRight, LayoutGrid, List, Download, FileText, ChevronDown, Clock, Flame, File, ChevronUp, Layers, BookMarked } from 'lucide-react';
import { useRecursosEstudianteStore } from '../../../store/recursosEstudianteStore';

export const RecursosEstudiante = () => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const { items: recursos, fetchRecursos } = useRecursosEstudianteStore();

  useEffect(() => {
    fetchRecursos();
  }, [fetchRecursos]);

  // Quick Filters State (Horizontal Top)
  const [activeQuickFilter, setActiveQuickFilter] = useState('todos');
  const [sortBy, setSortBy] = useState('relevantes');

  // Sidebar Filters State
  const [tipoFilters, setTipoFilters] = useState<string[]>([]);
  const [nivelFilters, setNivelFilters] = useState<string[]>([]);
  const [materiaFilters, setMateriaFilters] = useState<string[]>([]);
  const [formatoFilters, setFormatoFilters] = useState<string[]>([]);
  const [materiaSearch, setMateriaSearch] = useState('');

  // Active Tags for the UI representation
  const [, setActiveTags] = useState<{id: string, label: string}[]>([
    { id: 't1', label: 'Tipo: Libros' },
    { id: 'f1', label: 'Formato: PDF' },
    { id: 'n1', label: 'Nivel: 3er PAO' }
  ]);

  // Collapsible sections state (Sidebar)
  const [openSections, setOpenSections] = useState({
    tipo: true,
    nivel: true,
    materia: true,
    formato: true,
    ordenar: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFilter = (setFilter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setFilter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const materias = Array.from(new Set(recursos.map(r => r.materia))).sort();
  const filterCounts = {
    tipo: { 'Libros': 823, 'Software': 176, 'Sílabos': 249, 'Otros documentos': 42 },
    nivel: { '1er PAO': 142, '2do PAO': 135, '3er PAO': 156, '4to PAO': 172, '5to PAO': 168, '6to PAO': 189, '7mo PAO': 140, '8vo PAO': 110, 'Varios': 563 },
    formato: { 'PDF': 1012, 'EPUB': 186, 'ZIP / RAR': 58 }
  };

  const filteredItems = useMemo(() => {
    let items = [...recursos];

    // Sidebar Filters
    if (tipoFilters.length > 0) items = items.filter(i => tipoFilters.includes(i.tipo));
    if (nivelFilters.length > 0) items = items.filter(i => nivelFilters.includes(i.nivel));
    if (materiaFilters.length > 0) items = items.filter(i => materiaFilters.includes(i.materia));
    if (formatoFilters.length > 0) items = items.filter(i => formatoFilters.includes(i.formato));

    // Horizontal Quick Filters
    if (activeQuickFilter !== 'todos') {
      // Lógica para descargados/recientes si aplicara
    }

    // Search Bar
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.titulo.toLowerCase().includes(q) || i.descripcion.toLowerCase().includes(q) || i.materia.toLowerCase().includes(q));
    }

    return items;
  }, [tipoFilters, nivelFilters, materiaFilters, formatoFilters, activeQuickFilter, search]);

  const clearAllFilters = () => {
    setActiveTags([]);
    setActiveQuickFilter('todos');
    setSearch('');
    setTipoFilters([]);
    setNivelFilters([]);
    setMateriaFilters([]);
    setFormatoFilters([]);
  };

  const materiasFiltradas = materias.filter(m => m.toLowerCase().includes(materiaSearch.toLowerCase()));

  const quickFilters = [
    { id: 'todos', label: 'Todos', icon: LayoutGrid },
    { id: 'descargados', label: 'Más descargados', icon: Flame },
    { id: 'recientes', label: 'Recientes', icon: Clock },
  ];

  return (
    <div className="flex-1 flex min-h-0 relative overflow-hidden h-full bg-[#f4f7fb]">
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300">
        
        {/* HERO SECTION - BANNER UPDATE */}
        <div className="w-full bg-[#1a1f26] relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.25]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1f26] via-[#1a1f26]/90 to-[#1a1f26]/80"></div>
          
          <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-[14px] bg-[#b00000] flex items-center justify-center text-white shadow-lg">
                <BookOpen className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[28px] md:text-[34px] font-black text-white tracking-tight leading-none mb-1.5">
                  Repositorio Digital
                </h2>
                <p className="text-[13px] text-gray-400 font-medium">Descarga libros, software y sílabos organizados por nivel y materia.</p>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-[#212730] rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">1.248</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Total recursos</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>
              
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">823</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Libros</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <MonitorPlay className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">176</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Software</span>
                </div>
              </div>

              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <File className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">249</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Sílabos</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-[#212730] px-4 py-2 rounded-full border border-white/5">
              <span className="hover:text-gray-200 cursor-pointer transition-colors">INICIO</span>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <span className="text-espoch-yellow">RECURSOS</span>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 flex w-full p-6 lg:p-8 gap-8 items-start overflow-hidden">
          
          {/* SIDEBAR FILTROS (RECUPERADO) */}
          <aside className="w-[280px] shrink-0 hidden lg:flex flex-col bg-white rounded-[20px] shadow-[0_2px_15px_rgba(0,0,0,0.03)] h-full overflow-hidden border border-gray-100">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
              <h3 className="text-[14px] font-black text-gray-900 tracking-wide">FILTRAR RECURSOS</h3>
              <button onClick={clearAllFilters} className="text-[12px] font-bold text-espoch-red hover:underline">
                Limpiar filtros
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">
              
              {/* Tipo de recurso */}
              <div className="py-4 border-b border-gray-100 last:border-0">
                <button onClick={() => toggleSection('tipo')} className="flex items-center justify-between w-full text-left mb-3 group">
                  <div className="flex items-center gap-2.5 text-[14px] font-extrabold text-gray-900 group-hover:text-espoch-red transition-colors">
                    <BookOpen className="w-4 h-4" /> Tipo de recurso
                  </div>
                  {openSections.tipo ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {openSections.tipo && (
                  <div className="flex flex-col gap-2.5 mt-1 animate-fade-in">
                    {Object.entries(filterCounts.tipo).map(([tipo, count]) => (
                      <label key={tipo} className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="peer sr-only" checked={tipoFilters.includes(tipo)} onChange={() => toggleFilter(setTipoFilters, tipo)} />
                          <div className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all ${tipoFilters.includes(tipo) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300 bg-white'}`}>
                            {tipoFilters.includes(tipo) && <div className="w-[4px] h-[8px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                          </div>
                          <span className="text-[13px] font-medium text-gray-600 group-hover:text-gray-900">{tipo}</span>
                        </div>
                        <span className="text-[12px] text-gray-400 font-medium">{count}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Nivel semestral */}
              <div className="py-4 border-b border-gray-100 last:border-0">
                <button onClick={() => toggleSection('nivel')} className="flex items-center justify-between w-full text-left mb-3 group">
                  <div className="flex items-center gap-2.5 text-[14px] font-extrabold text-gray-900 group-hover:text-espoch-red transition-colors">
                    <Layers className="w-4 h-4" /> Nivel semestral
                  </div>
                  {openSections.nivel ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {openSections.nivel && (
                  <div className="flex flex-col gap-2.5 mt-1 animate-fade-in">
                    {Object.entries(filterCounts.nivel).map(([nivel, count]) => (
                      <label key={nivel} className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="peer sr-only" checked={nivelFilters.includes(nivel)} onChange={() => toggleFilter(setNivelFilters, nivel)} />
                          <div className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all ${nivelFilters.includes(nivel) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300 bg-white'}`}>
                            {nivelFilters.includes(nivel) && <div className="w-[4px] h-[8px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                          </div>
                          <span className="text-[13px] font-medium text-gray-600 group-hover:text-gray-900">{nivel}</span>
                        </div>
                        <span className="text-[12px] text-gray-400 font-medium">{count}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Materia */}
              <div className="py-4 border-b border-gray-100 last:border-0">
                <button onClick={() => toggleSection('materia')} className="flex items-center justify-between w-full text-left mb-3 group">
                  <div className="flex items-center gap-2.5 text-[14px] font-extrabold text-gray-900 group-hover:text-espoch-red transition-colors">
                    <BookMarked className="w-4 h-4" /> Materia
                  </div>
                  {openSections.materia ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {openSections.materia && (
                  <div className="flex flex-col gap-3 mt-1 animate-fade-in">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Buscar materia..."
                        value={materiaSearch}
                        onChange={(e) => setMateriaSearch(e.target.value)}
                        className="w-full bg-white text-[13px] text-gray-700 rounded-lg py-2 pl-9 pr-3 outline-none border border-gray-200 focus:border-gray-300 transition-all placeholder:text-gray-400" 
                      />
                    </div>
                    <div className="flex flex-col gap-2.5 mt-1">
                      {materiasFiltradas.slice(0, 4).map(materia => (
                        <label key={materia} className="flex items-center justify-between cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" className="peer sr-only" checked={materiaFilters.includes(materia)} onChange={() => toggleFilter(setMateriaFilters, materia)} />
                            <div className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all ${materiaFilters.includes(materia) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300 bg-white'}`}>
                              {materiaFilters.includes(materia) && <div className="w-[4px] h-[8px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                            </div>
                            <span className="text-[13px] font-medium text-gray-600 group-hover:text-gray-900">{materia}</span>
                          </div>
                          <span className="text-[12px] text-gray-400 font-medium">{Math.floor(Math.random() * 50) + 40}</span>
                        </label>
                      ))}
                      {materiasFiltradas.length > 4 && (
                        <button className="text-[13px] font-bold text-espoch-red text-left mt-1 hover:underline">
                          Ver más
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Formato */}
              <div className="py-4 border-b border-gray-100 last:border-0">
                <button onClick={() => toggleSection('formato')} className="flex items-center justify-between w-full text-left mb-3 group">
                  <div className="flex items-center gap-2.5 text-[14px] font-extrabold text-gray-900 group-hover:text-espoch-red transition-colors">
                    <FileText className="w-4 h-4" /> Formato
                  </div>
                  {openSections.formato ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {openSections.formato && (
                  <div className="flex flex-col gap-2.5 mt-1 animate-fade-in">
                    {Object.entries(filterCounts.formato).map(([formato, count]) => (
                      <label key={formato} className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="peer sr-only" checked={formatoFilters.includes(formato)} onChange={() => toggleFilter(setFormatoFilters, formato)} />
                          <div className={`w-[18px] h-[18px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all ${formatoFilters.includes(formato) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300 bg-white'}`}>
                            {formatoFilters.includes(formato) && <div className="w-[4px] h-[8px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                          </div>
                          <span className="text-[13px] font-medium text-gray-600 group-hover:text-gray-900">{formato}</span>
                        </div>
                        <span className="text-[12px] text-gray-400 font-medium">{count}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </aside>

          {/* RIGHT COLUMN (HORIZONTAL FILTERS + CONTENT) */}
          <div className="flex-1 flex flex-col w-full gap-6 overflow-hidden h-full min-w-0">
            
            {/* HORIZONTAL FILTERS - NUEVO DISEÑO 1 FILA */}
            <div className="flex flex-col gap-3 w-full shrink-0 bg-white/50 backdrop-blur-sm p-3 rounded-[20px] border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              
              <div className="flex flex-wrap xl:flex-nowrap items-center gap-3 w-full">
                


                {/* Quick Filters (Pills) */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar flex-1 px-1">
                  {quickFilters.map(filter => {
                    const Icon = filter.icon;
                    const isActive = activeQuickFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setActiveQuickFilter(filter.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-extrabold transition-all border whitespace-nowrap shrink-0 shadow-sm
                          ${isActive 
                            ? 'bg-red-50 text-espoch-red border-espoch-red' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800 hover:bg-gray-50'
                          }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-espoch-red' : 'text-gray-500'}`} />
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
                
                {/* Sort Dropdown */}
                <div className="relative w-[180px] shrink-0 shadow-sm hidden sm:block">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 text-gray-700 text-[13px] font-bold py-2.5 pl-4 pr-10 rounded-xl outline-none focus:border-espoch-red/50 transition-all cursor-pointer"
                  >
                    <option value="relevantes">Más relevantes</option>
                    <option value="recientes">Más recientes</option>
                    <option value="az">Alfabéticamente</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shrink-0 shadow-sm hidden sm:flex">
                  <button onClick={() => setViewMode('grid')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-red-50 text-espoch-red border border-red-100 shadow-sm' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'}`}>
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-red-50 text-espoch-red border border-red-100 shadow-sm' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'}`}>
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>


            </div>

            {/* CONTENT (GRID/LIST) */}
            <div className="flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar w-full">
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5" 
                : "flex flex-col gap-3"}>
                
                {filteredItems.map((item) => (
                  viewMode === 'grid' ? (
                    <div key={item.id} className="group relative rounded-[20px] shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] transition-all duration-300 overflow-hidden flex flex-col h-[260px] bg-[#1a1f26]">
                      {/* Full Background Image */}
                      <img src={item.foto} alt={item.titulo} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
                        <div className="bg-white text-espoch-red text-[9px] font-extrabold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                          {item.tipo === 'Libros' && <BookOpen className="w-3.5 h-3.5" />}
                          {item.tipo === 'Software' && <MonitorPlay className="w-3.5 h-3.5" />}
                          {item.tipo === 'Sílabos' && <FileText className="w-3.5 h-3.5" />}
                          {item.tipo}
                        </div>
                      </div>

                      {/* Contenido Inferior (Glassmorphism) */}
                      <div className="absolute bottom-2 left-2 right-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex flex-col z-10 text-white shadow-lg">
                        <h3 className="text-[12px] font-extrabold leading-tight mb-1 line-clamp-2">{item.titulo}</h3>
                        
                        <div className="flex items-center justify-between mt-1 mb-3">
                          <p className="text-[9px] font-medium text-gray-200 flex items-center gap-1 truncate max-w-[60%]">
                            <span className="truncate">{item.materia}</span>
                          </p>
                          <p className="text-[8px] font-mono text-gray-300 bg-black/40 px-1 py-0.5 rounded text-right tracking-wider uppercase shrink-0">{item.nivel}</p>
                        </div>

                        {/* Botón Agregar / Contador */}
                        <div className="flex items-center justify-between gap-2 mt-auto">
                          <div className="text-[10px] font-black text-gray-100 flex flex-col justify-center bg-black/30 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 h-[34px] shrink-0 min-w-[70px]">
                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Formato</span>
                            <div className="flex items-center gap-1.5 leading-none">
                              {item.formato} • {item.peso}
                            </div>
                          </div>

                          <div className="flex-1 h-[34px]">
                            <button className="w-full h-full bg-white hover:bg-gray-50 text-gray-900 text-[10px] font-extrabold rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5">
                              <Download className="w-3.5 h-3.5" /> Descargar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} className="flex items-center gap-5 bg-white rounded-[16px] p-3 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-all group">
                      <div className="relative w-[84px] h-[84px] shrink-0 rounded-xl overflow-hidden border border-gray-100">
                        <img src={item.foto} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="text-[15px] font-black text-gray-900 mb-0.5 truncate">{item.titulo}</h3>
                        <p className="text-[12px] font-medium text-gray-500 mb-2">{item.descripcion}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">{item.tipo}</span>
                          <span className="text-[10px] font-bold text-espoch-red bg-red-50 px-2 py-1 rounded-md">{item.nivel}</span>
                          <span className="text-[11px] font-semibold text-gray-600 border-l border-gray-200 pl-2">{item.materia}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3 shrink-0 px-2">
                        <div className="text-right">
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block mb-0.5">FORMATO</span>
                          <span className="text-[13px] font-black text-gray-800">{item.formato}</span>
                        </div>
                        <div className="w-[140px]">
                          <button className="w-full py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-900 text-[12px] font-extrabold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group-hover:border-espoch-red group-hover:text-espoch-red">
                            <Download className="w-4 h-4" /> Descargar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ))}

                {filteredItems.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 bg-white rounded-[20px] border border-gray-100 border-dashed">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-[15px] font-bold text-gray-500">No se encontraron recursos</p>
                    <p className="text-[12px] text-gray-400 mt-1">Intenta ajustando o limpiando los filtros actuales.</p>
                    <button onClick={clearAllFilters} className="mt-4 px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[12px] font-bold rounded-lg transition-colors">
                      Limpiar todos los filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
