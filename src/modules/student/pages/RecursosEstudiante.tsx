import { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  MonitorPlay, 
  Search, 
  ChevronRight, 
  LayoutGrid, 
  List, 
  Download, 
  FileText, 
  ChevronDown, 
  Clock, 
  Eye, 
  X, 
  Bookmark, 
  Layers, 
  BookMarked, 
  Folder, 
  CheckCircle2, 
  Sparkles,
  Laptop,
  RotateCw
} from 'lucide-react';
import { useRecursosEstudianteStore, type RecursoEstudianteItem } from '../../../store/recursosEstudianteStore';
import { useTramitesStore, type Tramite } from '../../../store/tramitesStore';

// ── ILUSTRACIONES SVG PERSONALIZADAS SEGÚN EL TIPO DE RECURSO REAL ───────────
const ProteusPreview = () => (
  <div className="w-full h-full bg-[#0d1726] rounded-xl flex flex-col justify-between p-2.5 relative overflow-hidden border border-cyan-950/40 select-none">
    <div className="flex items-center justify-between border-b border-cyan-900/40 pb-1.5">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 inline-block" />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 inline-block" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 inline-block" />
      </div>
      <span className="text-[7.5px] font-mono text-cyan-400/80 tracking-tight truncate max-w-[120px]">
        Software CAD / Simulación
      </span>
    </div>

    <div className="flex flex-col items-center justify-center my-auto py-2 text-center">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/30 flex items-center justify-center mb-1 shadow-inner">
        <Laptop className="w-5 h-5 text-cyan-300" />
      </div>
      <span className="text-[12px] font-black text-white tracking-wider leading-none">
        SIMULACIÓN
      </span>
      <span className="text-[8.5px] font-bold text-cyan-400 tracking-widest mt-0.5 leading-none">
        CIRCUITOS
      </span>
    </div>

    <div className="flex items-center justify-between pt-1 border-t border-cyan-900/30 text-[7px] text-cyan-500/70 font-mono">
      <span>Instalador oficial</span>
      <span>ESPOCH</span>
    </div>
  </div>
);

const OscilloscopePreview = () => (
  <div className="w-full h-full bg-[#1b2430] rounded-xl flex flex-col p-2 relative overflow-hidden border border-slate-700/60 select-none">
    <div className="w-full flex-1 bg-[#09121a] rounded-lg border border-cyan-900/40 p-1.5 flex flex-col justify-between relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)',
          backgroundSize: '12px 12px'
        }}
      />
      <svg className="w-full h-12 relative z-10" viewBox="0 0 160 48" preserveAspectRatio="none">
        <path
          d="M 0,24 Q 20,4 40,24 T 80,24 T 120,24 T 160,24"
          fill="none"
          stroke="#00f0ff"
          strokeWidth="2"
          className="drop-shadow-[0_0_4px_#00f0ff]"
        />
        <path
          d="M 0,24 Q 20,44 40,24 T 80,24 T 120,24 T 160,24"
          fill="none"
          stroke="#facc15"
          strokeWidth="1.75"
          className="drop-shadow-[0_0_3px_#facc15]"
        />
      </svg>
      <div className="flex items-center justify-between relative z-10 pt-1">
        <span className="text-[7px] font-mono text-cyan-400">CH1: 5V/div</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 border border-black/40" />
          <span className="w-2 h-2 rounded-full bg-yellow-400 border border-black/40" />
          <span className="w-2 h-2 rounded-full bg-slate-300 border border-black/40" />
        </div>
        <span className="text-[7px] font-mono text-yellow-400">CH2: 2ms</span>
      </div>
    </div>
  </div>
);

const SafetyPreview = () => (
  <div className="w-full h-full bg-[#f8fafc] rounded-xl flex flex-col items-center justify-between p-2.5 border border-slate-200/80 select-none">
    <div className="flex flex-col items-center">
      <div className="w-8 h-4 rounded-t-full bg-amber-400 border border-amber-500 shadow-sm relative">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-100 mx-auto mt-0.5 animate-pulse" />
      </div>
      <div className="w-10 h-1 bg-amber-600 rounded-full" />
    </div>

    <div className="w-full bg-white rounded-lg p-2 border border-slate-200/90 shadow-2xs flex items-center justify-around gap-1">
      <div className="w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center relative">
        <div className="w-4 h-0.5 bg-red-500 transform rotate-45" />
      </div>

      <div className="w-6 h-6 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-500 fill-amber-400 stroke-amber-600" strokeWidth="1.5">
          <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
        </svg>
      </div>

      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
        ⚡
      </div>

      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-extrabold font-mono">
        L
      </div>
    </div>

    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">
      Normativa ESPOCH
    </span>
  </div>
);

const DocumentPreview = ({ titulo }: { titulo: string }) => (
  <div className="w-full h-full bg-[#f1f5f9] rounded-xl flex flex-col justify-between p-2.5 border border-slate-200/70 select-none">
    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
      <FileText className="w-3.5 h-3.5 text-emerald-600" />
      <span className="text-[7.5px] font-mono text-emerald-700 font-bold">OFICIAL</span>
    </div>
    <div className="flex flex-col gap-1 py-1">
      <div className="w-3/4 h-1.5 bg-slate-300 rounded" />
      <div className="w-full h-1 bg-slate-200 rounded" />
      <div className="w-5/6 h-1 bg-slate-200 rounded" />
      <p className="text-[8px] font-bold text-slate-700 line-clamp-1 mt-1">{titulo}</p>
    </div>
    <div className="text-[7px] text-slate-400 font-mono text-right">PDF Verificado</div>
  </div>
);

export const RecursosEstudiante = () => {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recientes');
  const [favoritos, setFavoritos] = useState<Record<string, boolean>>({});
  const [recursoSeleccionado, setRecursoSeleccionado] = useState<RecursoEstudianteItem | null>(null);

  // Datos reales desde Supabase
  const { items: recursos, fetchRecursos, loading, error } = useRecursosEstudianteStore();
  const { tramites, fetchTramites } = useTramitesStore();

  useEffect(() => {
    void fetchRecursos();
    void fetchTramites();
  }, [fetchRecursos, fetchTramites]);

  // Filtros del panel lateral
  const [tipoFilters, setTipoFilters] = useState<string[]>([]);
  const [nivelFilters, setNivelFilters] = useState<string[]>([]);
  const [materiaFilters, setMateriaFilters] = useState<string[]>([]);
  const [formatoFilters, setFormatoFilters] = useState<string[]>([]);
  const [materiaSearch, setMateriaSearch] = useState('');

  // Secciones colapsables del acordeón
  const [openSections, setOpenSections] = useState({
    tipo: true,
    nivel: true,
    materia: true,
    formato: true
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFilter = (setFilter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setFilter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const toggleFavorito = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoritos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Cálculo de estadísticas dinámicas reales desde la base
  const estadisticas = useMemo(() => {
    const total = recursos.length;
    const libros = recursos.filter(r => r.tipo.toLowerCase().includes('libro')).length;
    const software = recursos.filter(r => r.tipo.toLowerCase().includes('soft')).length;
    const silabos = recursos.filter(r => r.tipo.toLowerCase().includes('sílab') || r.tipo.toLowerCase().includes('silab')).length;
    return { total, libros, software, silabos };
  }, [recursos]);

  // Lista de materias únicas desde los recursos reales
  const materias = useMemo(() => {
    return Array.from(new Set(recursos.map(r => r.materia).filter(Boolean))).sort();
  }, [recursos]);

  // Contadores dinámicos calculados directamente desde los registros de Supabase
  const filterCounts = useMemo(() => {
    const tipos: Record<string, number> = {};
    const niveles: Record<string, number> = {};
    const formatos: Record<string, number> = {};

    recursos.forEach(r => {
      // Tipos
      tipos[r.tipo] = (tipos[r.tipo] || 0) + 1;
      // Niveles
      if (r.nivel) niveles[r.nivel] = (niveles[r.nivel] || 0) + 1;
      // Formatos
      if (r.formato) formatos[r.formato] = (formatos[r.formato] || 0) + 1;
    });

    return { tipos, niveles, formatos };
  }, [recursos]);

  const totalFiltrosActivos = tipoFilters.length + nivelFilters.length + materiaFilters.length + formatoFilters.length;

  const clearAllFilters = () => {
    setSearch('');
    setTipoFilters([]);
    setNivelFilters([]);
    setMateriaFilters([]);
    setFormatoFilters([]);
  };

  // Filtrado y ordenamiento de registros reales
  const filteredItems = useMemo(() => {
    let items = [...recursos];

    // Filtro por Tipo
    if (tipoFilters.length > 0) {
      items = items.filter(i => tipoFilters.includes(i.tipo));
    }
    // Filtro por Nivel / PAO
    if (nivelFilters.length > 0) {
      items = items.filter(i => nivelFilters.includes(i.nivel));
    }
    // Filtro por Materia
    if (materiaFilters.length > 0) {
      items = items.filter(i => materiaFilters.includes(i.materia));
    }
    // Filtro por Formato
    if (formatoFilters.length > 0) {
      items = items.filter(i => formatoFilters.some(f => (i.formato || '').toUpperCase().includes(f.toUpperCase())));
    }

    // Búsqueda en tiempo real
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => 
        i.titulo.toLowerCase().includes(q) || 
        i.descripcion.toLowerCase().includes(q) || 
        i.materia.toLowerCase().includes(q)
      );
    }

    // Ordenamiento
    if (sortBy === 'az') {
      items.sort((a, b) => a.titulo.localeCompare(b.titulo));
    }

    return items;
  }, [recursos, tipoFilters, nivelFilters, materiaFilters, formatoFilters, search, sortBy]);

  const materiasFiltradas = materias.filter(m => m.toLowerCase().includes(materiaSearch.toLowerCase()));

  // Actividades recientes reales: tomadas de los registros reales de Supabase
  const actividadesReales = useMemo(() => {
    const listado: {
      id: string;
      nombre: string;
      subtitulo: string;
      badge: string;
      fecha: string;
      tipo: 'recurso' | 'tramite';
    }[] = [];

    // Añadir últimos recursos disponibles en Supabase
    recursos.slice(0, 4).forEach(r => {
      listado.push({
        id: `rec-${r.id}`,
        nombre: r.titulo,
        subtitulo: `${r.tipo} • ${r.materia}`,
        badge: r.tipo.toUpperCase(),
        fecha: 'En repositorio',
        tipo: 'recurso'
      });
    });

    // Añadir trámites reales del estudiante
    tramites.slice(0, 4).forEach((t: Tramite) => {
      listado.push({
        id: `tra-${t.id}`,
        nombre: t.asunto || 'Trámite estudiantil',
        subtitulo: `Estado: ${t.estado}`,
        badge: 'TRÁMITE',
        fecha: t.fecha ? new Date(t.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : 'Reciente',
        tipo: 'tramite'
      });
    });

    return listado.slice(0, 8);
  }, [recursos, tramites]);

  const renderCardIllustration = (item: RecursoEstudianteItem) => {
    // Si tiene foto o portada_url real de Supabase, se muestra
    if (item.foto && !item.foto.includes('placeholder')) {
      return (
        <img 
          src={item.foto} 
          alt={item.titulo} 
          className="w-full h-full object-cover rounded-xl"
          loading="lazy"
        />
      );
    }

    const titleLower = item.titulo.toLowerCase();
    if (titleLower.includes('proteus') || item.tipo.toLowerCase().includes('soft')) {
      return <ProteusPreview />;
    }
    if (titleLower.includes('circuito') || titleLower.includes('oscilo') || titleLower.includes('física') || titleLower.includes('control')) {
      return <OscilloscopePreview />;
    }
    if (titleLower.includes('seguridad') || titleLower.includes('norma') || titleLower.includes('manual') || titleLower.includes('práctica')) {
      return <SafetyPreview />;
    }
    return <DocumentPreview titulo={item.titulo} />;
  };

  const renderBadgePill = (tipo: string) => {
    const t = tipo.toLowerCase();
    if (t.includes('soft')) {
      return (
        <span className="bg-[#f2ebfc] text-[#8039d9] border border-[#e2d4f8] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
          <MonitorPlay className="w-3 h-3" /> Software
        </span>
      );
    }
    if (t.includes('libr')) {
      return (
        <span className="bg-[#e8f1fc] text-[#1b68ba] border border-[#d0e3fa] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
          <BookOpen className="w-3 h-3" /> Libro
        </span>
      );
    }
    if (t.includes('sílab') || t.includes('silab')) {
      return (
        <span className="bg-[#eaf8f0] text-[#1b8a5a] border border-[#c6eed7] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
          <CheckCircle2 className="w-3 h-3" /> Sílabo
        </span>
      );
    }
    return (
      <span className="bg-[#fef6e7] text-[#c97a08] border border-[#fde8c2] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
        <FileText className="w-3 h-3" /> {tipo}
      </span>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f4f7fb]">
      
      {/* ── HERO BANNER: DATOS 100% REALES DE SUPABASE ─────────────── */}
      <div className="relative flex min-h-[92px] shrink-0 items-center overflow-hidden border-b border-gray-800 bg-[#121721] px-6 py-4 shadow-sm lg:px-10">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#121721] via-[#121721]/95 to-[#121721]/80" />
        
        <div className="relative z-10 flex w-full items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-espoch-red text-white shadow-lg shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight">Repositorio Digital</h1>
              <p className="mt-0.5 text-[11px] text-gray-400 font-medium">Recursos académicos oficiales sincronizados con la base de datos de la carrera.</p>
            </div>
          </div>

          {/* Estadísticas Reales de Supabase */}
          <div className="hidden lg:flex items-center gap-6 bg-white/[0.04] rounded-xl px-5 py-2.5 border border-white/5 shadow-inner">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[14px] font-black text-white leading-tight">{estadisticas.total}</span>
                <span className="text-[9px] font-medium text-gray-400 leading-none">Total recursos</span>
              </div>
            </div>
            
            <div className="w-px h-6 bg-white/10" />

            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[14px] font-black text-white leading-tight">{estadisticas.libros}</span>
                <span className="text-[9px] font-medium text-gray-400 leading-none">Libros</span>
              </div>
            </div>

            <div className="w-px h-6 bg-white/10" />

            <div className="flex items-center gap-2.5">
              <MonitorPlay className="w-4 h-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[14px] font-black text-white leading-tight">{estadisticas.software}</span>
                <span className="text-[9px] font-medium text-gray-400 leading-none">Software</span>
              </div>
            </div>

            <div className="w-px h-6 bg-white/10" />

            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[14px] font-black text-white leading-tight">{estadisticas.silabos}</span>
                <span className="text-[9px] font-medium text-gray-400 leading-none">Sílabos</span>
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center gap-2 text-[11px] font-bold tracking-wider">
            <span className="text-slate-400">INICIO</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-amber-400 font-black">RECURSOS</span>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL: 3 COLUMNAS A LA MISMA ALTURA ────────── */}
      <div className="flex-1 flex w-full p-5 lg:p-8 gap-6 items-stretch overflow-hidden min-h-0">
        
        {/* COLUMNA 1: SIDEBAR FILTRAR RECURSOS */}
        <aside
          className="w-[245px] shrink-0 hidden lg:flex flex-col gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">FILTRAR RECURSOS</h3>
            <button
              onClick={clearAllFilters}
              disabled={totalFiltrosActivos === 0 && !search}
              className="text-xs font-semibold text-slate-400 hover:text-red-600 disabled:text-slate-300 disabled:hover:text-slate-300 disabled:cursor-default transition-colors cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>

          {/* Acordeón 1: Tipo de recurso */}
          <div className="flex flex-col pb-3 border-b border-slate-100">
            <button
              onClick={() => toggleSection('tipo')}
              className="flex items-center justify-between text-left py-1 text-xs font-bold text-slate-900 group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-500" />
                <span className="uppercase tracking-wider">Tipo de recurso</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openSections.tipo ? 'rotate-180' : ''}`} />
            </button>
            {openSections.tipo && (
              <div className="flex flex-col gap-2 mt-3 pl-1">
                {Object.keys(filterCounts.tipos).length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">Sin categorías registradas</span>
                ) : (
                  Object.entries(filterCounts.tipos).map(([tipo, count]) => {
                    const isChecked = tipoFilters.includes(tipo);
                    return (
                      <label key={tipo} className="flex items-center justify-between gap-2 cursor-pointer group">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={isChecked}
                            onChange={() => toggleFilter(setTipoFilters, tipo)}
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                            {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]" />}
                          </div>
                          <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">{tipo}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">{count}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Acordeón 2: Nivel semestral */}
          <div className="flex flex-col pb-3 border-b border-slate-100">
            <button
              onClick={() => toggleSection('nivel')}
              className="flex items-center justify-between text-left py-1 text-xs font-bold text-slate-900 group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span className="uppercase tracking-wider">Nivel semestral</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openSections.nivel ? 'rotate-180' : ''}`} />
            </button>
            {openSections.nivel && (
              <div className="flex flex-col gap-2 mt-3 pl-1 max-h-[160px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                {Object.keys(filterCounts.niveles).length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">Sin niveles registrados</span>
                ) : (
                  Object.entries(filterCounts.niveles).map(([nivel, count]) => {
                    const isChecked = nivelFilters.includes(nivel);
                    return (
                      <label key={nivel} className="flex items-center justify-between gap-2 cursor-pointer group">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={isChecked}
                            onChange={() => toggleFilter(setNivelFilters, nivel)}
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                            {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]" />}
                          </div>
                          <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">{nivel}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">{count}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Acordeón 3: Materia */}
          <div className="flex flex-col pb-3 border-b border-slate-100">
            <button
              onClick={() => toggleSection('materia')}
              className="flex items-center justify-between text-left py-1 text-xs font-bold text-slate-900 group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-slate-500" />
                <span className="uppercase tracking-wider">Materia</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openSections.materia ? 'rotate-180' : ''}`} />
            </button>
            {openSections.materia && (
              <div className="flex flex-col gap-2.5 mt-3 pl-1">
                {materias.length > 3 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Buscar materia..."
                      value={materiaSearch}
                      onChange={(e) => setMateriaSearch(e.target.value)}
                      className="w-full bg-slate-50 text-xs text-slate-700 rounded-lg py-1.5 pl-8 pr-2.5 outline-none border border-slate-200 focus:border-red-500 transition-all placeholder:text-slate-400 font-medium" 
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
                  {materiasFiltradas.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">Sin materias registradas</span>
                  ) : (
                    materiasFiltradas.map(materia => {
                      const isChecked = materiaFilters.includes(materia);
                      return (
                        <label key={materia} className="flex items-center justify-between gap-2 cursor-pointer group">
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={isChecked}
                              onChange={() => toggleFilter(setMateriaFilters, materia)}
                            />
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                              {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]" />}
                            </div>
                            <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">{materia}</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Acordeón 4: Formato */}
          <div className="flex flex-col">
            <button
              onClick={() => toggleSection('formato')}
              className="flex items-center justify-between text-left py-1 text-xs font-bold text-slate-900 group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-slate-500" />
                <span className="uppercase tracking-wider">Formato</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${openSections.formato ? 'rotate-180' : ''}`} />
            </button>
            {openSections.formato && (
              <div className="flex flex-col gap-2 mt-3 pl-1">
                {Object.keys(filterCounts.formatos).length === 0 ? (
                  <span className="text-[11px] text-slate-400 italic">Sin formatos registrados</span>
                ) : (
                  Object.entries(filterCounts.formatos).map(([formato, count]) => {
                    const isChecked = formatoFilters.includes(formato);
                    return (
                      <label key={formato} className="flex items-center justify-between gap-2 cursor-pointer group">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={isChecked}
                            onChange={() => toggleFilter(setFormatoFilters, formato)}
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                            {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]" />}
                          </div>
                          <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900 truncate">{formato}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0">{count}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        {/* COLUMNA 2: CONTENIDO CENTRAL */}
        <div className="flex-1 flex flex-col min-w-0 gap-5 h-full overflow-y-auto pr-1 pb-8" style={{ scrollbarWidth: 'thin' }}>
          
          {/* Barra Superior de Búsqueda + Herramientas */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar recursos, software, libros o materias..."
                className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-800 rounded-xl py-2.5 pl-10 pr-9 outline-none border border-slate-200/70 focus:border-red-500 transition-all font-medium placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={event => setSortBy(event.target.value)}
                  className="appearance-none bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-bold py-2.5 pl-3.5 pr-8 rounded-xl outline-none cursor-pointer transition"
                >
                  <option value="recientes">Más recientes</option>
                  <option value="az">Alfabéticamente (A-Z)</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${viewMode === 'grid' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Ver en cuadrícula"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${viewMode === 'list' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Ver en lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => void fetchRecursos()}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center transition shadow-2xs cursor-pointer"
                title="Actualizar datos desde Supabase"
              >
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-red-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Encabezado de la Sección de Recursos */}
          <div className="flex items-end justify-between pt-1">
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Recursos disponibles</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sincronizado con la base de datos de Supabase.</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Mostrando {filteredItems.length} {filteredItems.length === 1 ? 'recurso' : 'recursos'}
            </span>
          </div>

          {/* Contenido Grid / Lista */}
          {loading && filteredItems.length === 0 ? (
            <div className="py-20 text-center text-sm font-semibold text-slate-400 flex flex-col items-center justify-center gap-3">
              <RotateCw className="w-6 h-6 animate-spin text-red-600" />
              <span>Consultando registros en Supabase…</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm font-semibold text-red-700">
              Error al consultar recursos en Supabase: {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">No hay recursos en la base de datos</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Actualmente la tabla <code className="font-mono text-slate-600 bg-slate-100 px-1 py-0.5 rounded">recursos</code> de Supabase no contiene registros con los filtros activos.
              </p>
              <button
                onClick={() => {
                  clearAllFilters();
                  void fetchRecursos();
                }}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Actualizar base de datos
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(item => {
                const esFavorito = !!favoritos[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => setRecursoSeleccionado(item)}
                    className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer relative"
                  >
                    {/* Badge tipo en la parte superior izquierda */}
                    <div className="flex items-center justify-between mb-2.5">
                      {renderBadgePill(item.tipo)}
                      <button
                        onClick={(e) => toggleFavorito(item.id, e)}
                        className="text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                        title={esFavorito ? "Guardado en favoritos" : "Guardar en favoritos"}
                      >
                        <Bookmark className={`w-4 h-4 ${esFavorito ? 'text-espoch-red fill-espoch-red' : 'text-slate-400'}`} />
                      </button>
                    </div>

                    {/* Fila principal dividida en 2 columnas: Vista previa a la izquierda y Detalles a la derecha */}
                    <div className="grid grid-cols-[135px_1fr] sm:grid-cols-[150px_1fr] gap-3 items-stretch min-h-[140px]">
                      
                      <div className="h-full min-h-[135px] max-h-[155px] rounded-xl overflow-hidden relative">
                        {renderCardIllustration(item)}
                      </div>

                      <div className="flex flex-col justify-between min-w-0">
                        <div>
                          <h3 
                            className="font-bold text-[14px] text-espoch-red hover:text-red-700 transition leading-snug truncate" 
                            title={item.titulo}
                          >
                            {item.titulo}
                          </h3>

                          {/* Tags: Materia y Nivel */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 mb-2">
                            {item.materia && (
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[140px] flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5 text-slate-400" />
                                {item.materia}
                              </span>
                            )}
                            {item.nivel && (
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5 text-slate-400" />
                                {item.nivel}
                              </span>
                            )}
                          </div>

                          <p className="text-[11.5px] text-slate-500 leading-snug line-clamp-2">
                            {item.descripcion || 'Sin descripción adicional en la base de datos.'}
                          </p>
                        </div>

                        {/* Fila inferior de métricas y botones */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-2">
                          <div className="flex items-center gap-2.5 text-[10.5px] text-slate-500 font-medium">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.peso || item.formato || 'Disponible'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecursoSeleccionado(item);
                              }}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Ver</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.foto && item.foto.startsWith('http')) {
                                  window.open(item.foto, '_blank', 'noopener,noreferrer');
                                }
                              }}
                              className="w-7 h-7 rounded-xl bg-espoch-red hover:bg-red-700 text-white flex items-center justify-center transition shadow-2xs hover:shadow-xs cursor-pointer"
                              title="Descargar recurso"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredItems.map(item => {
                const esFavorito = !!favoritos[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() => setRecursoSeleccionado(item)}
                    className="flex items-center gap-4 bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="w-[110px] h-[80px] shrink-0 rounded-xl overflow-hidden relative">
                      {renderCardIllustration(item)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {renderBadgePill(item.tipo)}
                        <span className="text-xs font-bold text-slate-500">• {item.formato} ({item.peso})</span>
                      </div>
                      <h3 className="text-sm font-bold text-espoch-red truncate">{item.titulo}</h3>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{item.descripcion}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">{item.materia}</span>
                        <span>•</span>
                        <span>{item.nivel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pr-2">
                      <button
                        onClick={(e) => toggleFavorito(item.id, e)}
                        className="p-2 text-slate-400 hover:text-red-600 transition cursor-pointer"
                      >
                        <Bookmark className={`w-4 h-4 ${esFavorito ? 'text-espoch-red fill-espoch-red' : 'text-slate-400'}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecursoSeleccionado(item);
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ver</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.foto && item.foto.startsWith('http')) {
                            window.open(item.foto, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="w-8 h-8 rounded-xl bg-espoch-red hover:bg-red-700 text-white flex items-center justify-center transition shadow-2xs cursor-pointer"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* COLUMNA 3: SIDEBAR DERECHO (ACTIVIDAD RECIENTE A LA MISMA ALTURA) */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 hidden xl:flex flex-col min-h-0">
          
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900">Actividad reciente</h3>
              </div>
              <button
                onClick={() => {
                  void fetchRecursos();
                  void fetchTramites();
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 transition cursor-pointer"
              >
                Actualizar
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {actividadesReales.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center p-4">
                  <Clock className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">Sin actividad registrada en la base</p>
                </div>
              ) : (
                actividadesReales.map(item => (
                  <div
                    key={item.id}
                    className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/80 px-2 rounded-xl transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.tipo === 'recurso' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.tipo === 'recurso' ? <BookOpen className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-red-600 transition" title={item.nombre}>
                          {item.nombre}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-1 py-0.2 rounded shrink-0 ${
                            item.tipo === 'recurso' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.badge}
                          </span>
                          <p className="text-[10px] text-slate-500 leading-tight truncate">
                            {item.subtitulo}
                          </p>
                        </div>
                        <span className="text-[9.5px] text-slate-400 block mt-0.5 font-medium">
                          {item.fecha}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 pr-1">
                      <span className="w-2 h-2 rounded-full block bg-emerald-500" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </aside>

      </div>

      {/* ── MODAL DETALLE / VISTA PREVIA ─────────────────────────────────── */}
      {recursoSeleccionado && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative flex flex-col gap-4 animate-scale-up">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2">
                  {renderBadgePill(recursoSeleccionado.tipo)}
                </div>
                <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                  {recursoSeleccionado.titulo}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {recursoSeleccionado.materia} • {recursoSeleccionado.nivel}
                </p>
              </div>
              <button
                onClick={() => setRecursoSeleccionado(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full h-40 rounded-xl overflow-hidden">
              {renderCardIllustration(recursoSeleccionado)}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {recursoSeleccionado.descripcion || 'Sin descripción adicional.'}
            </p>

            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Formato</span>
                <span className="text-xs font-black text-slate-800">{recursoSeleccionado.formato || 'Digital'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Tamaño</span>
                <span className="text-xs font-black text-slate-800">{recursoSeleccionado.peso || 'N/A'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRecursoSeleccionado(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cerrar
              </button>
              {recursoSeleccionado.foto && recursoSeleccionado.foto.startsWith('http') && (
                <button
                  onClick={() => {
                    window.open(recursoSeleccionado.foto, '_blank', 'noopener,noreferrer');
                    setRecursoSeleccionado(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-espoch-red hover:bg-red-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Abrir recurso
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
