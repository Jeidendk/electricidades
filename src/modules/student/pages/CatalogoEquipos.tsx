import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitorSpeaker, Search, ChevronDown, LayoutGrid, List, Wrench, Settings, Sofa, Monitor, MapPin, Package, X, ClipboardList, Trash, FileText, Trash2, CheckCircle2, Bookmark, Send } from 'lucide-react';
import { useCatalogoEquiposStore, type EquipoCatalogo } from '../../../store/catalogoEquiposStore';
import { useCartStore } from '../../../store/cartStore';
import { useSolicitudesEquipoStore } from '../../../store/solicitudesEquipoStore';
import { generarPDFComprobante, type PDFRequestData } from '../../../utils/pdfGenerator';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { useMateriasStore } from '../../../store/materiasStore';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';
import { avisoError, avisoExito, avisoInfo } from '../../../lib/aviso';
import { friendlyDbError } from '../../../lib/notifyError';
import { LabRightSidebar } from '../components/LabRightSidebar';

export const CatalogoEquipos = () => {
  const navigate = useNavigate();
  const { cart, cartOpen, setCartOpen, addToCart, updateQty, removeFromCart, clearCart } = useCartStore();
  const { items: catalogoData, fetchItems, loading, error } = useCatalogoEquiposStore();
  const { items: solicitudes, fetchItems: fetchSolicitudes } = useSolicitudesEquipoStore();
  const authUser = useAuthStore(s => s.user);
  const { materias, fetchMaterias } = useMateriasStore();
  const [search, setSearch] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // La BD guarda las imágenes en fotos_json (array). Devuelve la primera o un placeholder.
  const fotoDe = (it: any): string => {
    const f = it?.fotos_json;
    return (Array.isArray(f) ? f[0] : f) || '/background.png';
  };

  useEffect(() => {
    fetchItems({ forzar: true });
  }, [fetchItems]);

  // Las asignaturas de la malla del estudiante. El store filtra por carrera en la consulta;
  // el PAO se filtra aquí porque la misma lista sirve para todos los niveles de la carrera.
  useEffect(() => {
    if (authUser?.carreraId) fetchMaterias(authUser.carreraId);
  }, [authUser?.carreraId, fetchMaterias]);

  useEffect(() => {
    if (authUser?.id) {
      void fetchSolicitudes(authUser.id);
    }
  }, [authUser?.id, fetchSolicitudes]);

  const materiasDelPao = useMemo(() => {
    if (!authUser?.carreraId || authUser.pao == null) return [];
    return materias
      .filter(materia => materia.id_carrera === authUser.carreraId && materia.semestre === authUser.pao)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [materias, authUser?.carreraId, authUser?.pao]);
  
  // Filters
  const [catFilters, setCatFilters] = useState<string[]>([]);
  const [stockFilters, setStockFilters] = useState<string[]>([]);
  const [labFilters, setLabFilters] = useState<string[]>([]);
  const [marcaFilters, setMarcaFilters] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('name-asc');
  
  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form State
  // La materia se guarda por id: el nombre escrito a mano produce grafías distintas para la
  // misma asignatura y deja los informes sin agrupar. `asignaturaLibre` es el respaldo de quien
  // todavía no tiene malla cargada.
  const [idMateria, setIdMateria] = useState('');
  const [asignaturaLibre, setAsignaturaLibre] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('Sacar');
  const [observaciones, setObservaciones] = useState('');
  /** Envío en curso: bloquea el botón para que un doble clic no mande dos solicitudes. */
  const [enviando, setEnviando] = useState(false);
  /** Última solicitud registrada, para volver a descargar el comprobante sin crear otra. */
  const [ultimoComprobante, setUltimoComprobante] = useState<PDFRequestData | null>(null);

  const filteredItems = useMemo(() => {
    let items = [...catalogoData];

    if (catFilters.length > 0) {
      items = items.filter(i => catFilters.includes(i.categoria));
    }

    if (stockFilters.length > 0) {
      if (stockFilters.includes('disponible') && !stockFilters.includes('agotado')) {
        items = items.filter(i => i.estado === 'disponible' && i.stock > 0);
      } else if (stockFilters.includes('agotado') && !stockFilters.includes('disponible')) {
        items = items.filter(i => i.estado !== 'disponible' || i.stock === 0);
      }
    }

    if (labFilters.length > 0) {
      items = items.filter(i => labFilters.some(l => i.ubicacion.toLowerCase().includes(l.toLowerCase())));
    }

    if (marcaFilters.length > 0) {
      items = items.filter(i => marcaFilters.some(m => i.nombre.toLowerCase().includes(m.toLowerCase())));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.nombre.toLowerCase().includes(q) || i.serie.toLowerCase().includes(q) || i.ubicacion.toLowerCase().includes(q));
    }

    if (sortOrder === 'name-asc') items.sort((a, b) => a.nombre.localeCompare(b.nombre));
    if (sortOrder === 'name-desc') items.sort((a, b) => b.nombre.localeCompare(a.nombre));
    if (sortOrder === 'stock-desc') items.sort((a, b) => b.stock - a.stock);
    if (sortOrder === 'stock-asc') items.sort((a, b) => a.stock - b.stock);

    return items;
  }, [catalogoData, catFilters, stockFilters, labFilters, marcaFilters, search, sortOrder]);

  const toggleFilter = (setFilter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setFilter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const filtrosActivos = catFilters.length + stockFilters.length + labFilters.length + marcaFilters.length;
  const categoriasDisponibles = useMemo(
    () => [...new Set(catalogoData.map(item => item.categoria))].sort(),
    [catalogoData],
  );
  const laboratoriosDisponibles = useMemo(
    () => [...new Set(catalogoData.map(item => item.ubicacion).filter(Boolean))].sort(),
    [catalogoData],
  );
  const resumenCatalogo = useMemo(() => {
    const total = catalogoData.reduce((suma, item) => suma + item.stock_total, 0);
    const disponibles = catalogoData.reduce((suma, item) => suma + item.stock, 0);
    return { total, disponibles, mantenimiento: Math.max(0, total - disponibles) };
  }, [catalogoData]);

  /** Últimos 8 ítems ordenados por created_at descendente para el carousel y el sidebar */
  const itemsRecientes = useMemo(() =>
    [...catalogoData]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8),
    [catalogoData],
  );

  const handleToggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectItem = (item: EquipoCatalogo) => {
    setSearch(item.nombre);
    const el = document.getElementById('catalogo-grid-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  /** Formatea las solicitudes del estudiante para el widget del sidebar derecho */
  const solicitudesSidebar = useMemo(() => {
    return solicitudes.slice(0, 5).map(s => {
      let timeAgo = s.fecha;
      try {
        const fechaIso = s.hora ? `${s.fecha}T${s.hora}` : s.fecha;
        const diff = Date.now() - new Date(fechaIso).getTime();
        const min = Math.floor(diff / 60000);
        if (min < 60) timeAgo = `Hace ${Math.max(1, min)} min`;
        else {
          const h = Math.floor(min / 60);
          if (h < 24) timeAgo = `Hace ${h} h`;
          else {
            const d = Math.floor(h / 24);
            timeAgo = `Hace ${d} día${d !== 1 ? 's' : ''}`;
          }
        }
      } catch {
        timeAgo = s.fecha;
      }

      return {
        id: s.id,
        equipmentName: s.itemsStr || s.asignatura || 'Solicitud de equipos',
        requestCode: s.numero || `SOL-${s.id.slice(0, 6)}`,
        timeAgo,
        status: s.estado,
      };
    });
  }, [solicitudes]);

  const clearCatalogFilters = () => {
    setCatFilters([]); setStockFilters([]); setLabFilters([]); setMarcaFilters([]);
  };

  const getCategoryIcon = (cat: string) => {
    if (cat === 'herramientas') return <Wrench className="w-3 h-3" />;
    if (cat === 'equipos') return <Settings className="w-3 h-3" />;
    if (cat === 'mobiliario') return <Sofa className="w-3 h-3" />;
    return <Monitor className="w-3 h-3" />;
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === 'herramientas') return 'Herramienta';
    if (cat === 'equipos') return 'Equipo';
    if (cat === 'mobiliario') return 'Mobiliario';
    return 'Tecnológico';
  };

  const getCategoryColor = (cat: string) => {
    if (cat === 'herramientas') return 'bg-amber-100/90 text-amber-800 border-amber-200/60';
    if (cat === 'equipos') return 'bg-sky-100/90 text-sky-800 border-sky-200/60';
    if (cat === 'mobiliario') return 'bg-purple-100/90 text-purple-800 border-purple-200/60';
    return 'bg-emerald-100/90 text-emerald-800 border-emerald-200/60';
  };

  /**
   * Envía la solicitud y RECIÉN DESPUÉS imprime el comprobante.
   *
   * Antes era al revés: el PDF se generaba primero y el `insert` iba después dentro de un
   * try/catch que solo hacía `console.error`. Si el guardado fallaba —y fallaba siempre, porque
   * mandaba `id_materia: null` a una columna NOT NULL— el estudiante se quedaba con un
   * comprobante impreso de una solicitud que no existía, y con el carrito ya vaciado.
   */
  const enviarSolicitud = async () => {
    if (enviando) return;

    if (!authUser?.id) {
      void avisoInfo('Sesión no válida', 'Vuelve a iniciar sesión para enviar la solicitud.');
      return;
    }
    if (cart.length === 0) {
      void avisoInfo('El carrito está vacío', 'Agrega al menos un equipo antes de solicitar.');
      return;
    }
    if (!idMateria && !asignaturaLibre.trim()) {
      void avisoInfo('Falta la asignatura', 'Indica para qué asignatura necesitas el equipo.');
      return;
    }

    const items = cart.map((linea) => {
      const equipo = catalogoData.find(i => i.id === linea.id);
      return {
        id_equipo: equipo?.id ?? linea.id,
        nombre: equipo?.nombre ?? '',
        serie: equipo?.serie ?? '',
        categoria: equipo?.categoria ?? '',
        // Con la ubicación el servidor sabe de qué laboratorio reservar las unidades: el catálogo
        // agrupa por artículo Y ubicación, y el id del grupo es el de una unidad cualquiera.
        id_espacio: equipo?.id_espacio ?? null,
        cantidad: linea.qty,
        disponibles: equipo?.stock ?? 0,
      };
    });

    const sinNombre = items.find(i => !i.nombre.trim());
    if (sinNombre) {
      void avisoError('Equipo no reconocido', 'Vuelve a agregarlo al carrito: ya no está en el catálogo.');
      return;
    }
    const sinExistencias = items.find(i => i.cantidad < 1 || i.cantidad > i.disponibles);
    if (sinExistencias) {
      void avisoError(
        'Cantidad no disponible',
        'De "' + sinExistencias.nombre + '" quedan ' + sinExistencias.disponibles
        + ' unidades libres y pides ' + sinExistencias.cantidad + '.',
      );
      return;
    }

    // Aquí había un bloqueo por firma: se exigía una imagen guardada en la clave COMPARTIDA
    // `espoch_student_firma` de localStorage —en un equipo del laboratorio, la del estudiante
    // anterior— y el comprobante ni siquiera la imprimía. Pedir equipos no necesita firma
    // digital: el comprobante lleva su línea para firmar a mano.

    setEnviando(true);
    try {
      // El número lo pone el servidor con una secuencia. El azar de 4 dígitos que se usaba antes
      // repite números en cuanto hay unas decenas de solicitudes.
      const { data, error } = await supabase.rpc('crear_solicitud_equipo' as never, {
        p_id_materia: idMateria || null,
        p_asignatura_libre: idMateria ? null : asignaturaLibre.trim(),
        p_items: items.map(({ disponibles: _disponibles, ...item }) => item),
        p_observacion: observaciones.trim() || null,
      } as never);
      if (error) throw error;

      const solicitud = (Array.isArray(data) ? data[0] : data) as { numero?: string } | null;
      if (!solicitud?.numero) throw new Error('El servidor no devolvió el número de la solicitud.');

      const comprobante: PDFRequestData = {
        numeroSolicitud: solicitud.numero,
        fecha: new Date().toLocaleDateString('es-EC'),
        nombre: authUser.nombre || 'Estudiante',
        codigo: authUser.codigoInstitucional || 'No registrado',
        carrera: authUser.carreraNombre || 'No registrada',
        asignatura: materiasDelPao.find(m => m.id === idMateria)?.nombre || asignaturaLibre.trim(),
        tipoMovimiento,
        items: items.map(i => ({
          nombre: i.nombre,
          serie: i.serie,
          categoria: getCategoryLabel(i.categoria),
          cantidad: i.cantidad,
        })),
        observaciones: observaciones.trim(),
        estado: 'Pendiente de aprobación',
      };
      setUltimoComprobante(comprobante);

      clearCart();
      setIdMateria('');
      setAsignaturaLibre('');
      setObservaciones('');
      setCartOpen(false);
      // Lo pedido sigue libre hasta que el laboratorio apruebe, pero el catálogo pudo cambiar
      // mientras se llenaba el carrito.
      void fetchItems({ forzar: true });

      try {
        generarPDFComprobante(comprobante);
        void avisoExito('Solicitud enviada', 'Quedó registrada como ' + solicitud.numero + '.');
      } catch {
        void avisoInfo(
          'Solicitud ' + solicitud.numero + ' registrada',
          'No se pudo generar el comprobante en PDF, pero la solicitud sí quedó guardada. '
          + 'Descárgalo con el botón del carrito o desde Mis Solicitudes.',
        );
      }
    } catch (err: any) {
      // El carrito y el formulario se conservan: perder el trabajo por un corte de red sería el
      // peor momento para vaciarlos.
      const amigable = friendlyDbError(err);
      void avisoError(amigable.title, err?.message || amigable.text);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-0 relative overflow-hidden h-full">

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 bg-[#f4f7fb]">
        
        {/* HERO SECTION — consistente con el banner admin (PageHero) */}
        <div className="w-full min-h-[92px] bg-espoch-hero relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-4 border-b border-gray-800">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.25]"
            style={{ backgroundImage: `url('${HERO_BG.asignaciones}')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-espoch-hero via-espoch-hero/95 to-espoch-hero/80"></div>

          <div className="relative z-10 w-full flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 shrink-0 rounded-[14px] bg-espoch-red flex items-center justify-center text-white shadow-lg">
                <MonitorSpeaker className="w-7 h-7" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-[12px] font-extrabold text-white tracking-tight leading-none mb-1.5">
                  Catálogo de Equipos
                </h2>
                <p className="text-[11px] text-gray-400 font-medium">Explora, filtra y solicita el equipo que necesitas para tus prácticas.</p>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-espoch-herocard rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">{resumenCatalogo.total}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Total equipos</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>
              
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">{resumenCatalogo.disponibles}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Disponibles</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <Wrench className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">{resumenCatalogo.mantenimiento}</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Mantenimiento</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 flex w-full p-6 lg:p-10 gap-8 items-start overflow-hidden">
          
          {/* SIDEBAR FILTROS */}
          <aside className="w-[240px] shrink-0 hidden lg:flex flex-col gap-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs h-fit">

            {/* Header filtros + limpiar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Filtros</h3>
              <button
                onClick={clearCatalogFilters}
                disabled={filtrosActivos === 0}
                className="text-xs font-semibold text-slate-400 hover:text-red-600 disabled:text-slate-300 disabled:hover:text-slate-300 disabled:cursor-default transition-colors cursor-pointer"
              >
                Limpiar{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}
              </button>
            </div>

            {/* Categorías */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Categorías</h4>
              <div className="flex flex-col gap-2">
                {categoriasDisponibles.map(cat => {
                  const isChecked = catFilters.includes(cat);
                  return (
                    <label key={cat} className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" className="peer sr-only" checked={isChecked} onChange={() => toggleFilter(setCatFilters, cat)} />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                        {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                      </div>
                      <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900 capitalize leading-snug">{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Disponibilidad */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Disponibilidad</h4>
              <div className="flex flex-col gap-2">
                {['disponible', 'agotado'].map(stock => {
                  const isChecked = stockFilters.includes(stock);
                  return (
                    <label key={stock} className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" className="peer sr-only" checked={isChecked} onChange={() => toggleFilter(setStockFilters, stock)} />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                        {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                      </div>
                      <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900 leading-snug">{stock === 'disponible' ? 'En Stock' : 'Agotado'}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Laboratorio */}
            <div className="flex flex-col gap-2.5 pb-4 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Laboratorio</h4>
              <div className="flex flex-col gap-2">
                {laboratoriosDisponibles.map(lab => {
                  const isChecked = labFilters.includes(lab);
                  return (
                    <label key={lab} className="flex items-start gap-2.5 cursor-pointer group">
                      <input type="checkbox" className="peer sr-only" checked={isChecked} onChange={() => toggleFilter(setLabFilters, lab)} />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 mt-0.5 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                        {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                      </div>
                      <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900 leading-snug">{lab}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Marca */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Marca</h4>
              <div className="flex flex-col gap-2">
                {['Fluke', 'Tektronix', 'Siemens', 'HP', 'Cisco'].map(marca => {
                  const isChecked = marcaFilters.includes(marca);
                  return (
                    <label key={marca} className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" className="peer sr-only" checked={isChecked} onChange={() => toggleFilter(setMarcaFilters, marca)} />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                        {isChecked && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                      </div>
                      <span className="text-xs sm:text-[13px] font-medium text-slate-700 group-hover:text-slate-900 leading-snug">{marca}</span>
                    </label>
                  );
                })}
              </div>
            </div>

          </aside>

          {/* RIGHT CONTENT (FEED SCROLLABLE) */}
          <div className="flex-1 flex flex-col min-w-0 gap-6 h-full overflow-y-auto pr-1 pb-8" style={{ scrollbarWidth: 'thin' }}>

            {/* ── BARRA SUPERIOR DE BÚSQUEDA + HERRAMIENTAS ─────────── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 shadow-xs flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Buscar equipos, herramientas, marcas por nombre o serie..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm text-slate-800 rounded-xl py-2.5 pl-10 pr-9 outline-none border border-slate-200/70 focus:border-red-500 transition-all font-medium placeholder:text-slate-400" 
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="relative">
                  <select 
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="appearance-none bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-bold py-2.5 pl-3.5 pr-8 rounded-xl outline-none cursor-pointer transition"
                  >
                    <option value="name-asc">Nombre (A-Z)</option>
                    <option value="name-desc">Nombre (Z-A)</option>
                    <option value="stock-desc">Mayor Disponibilidad</option>
                    <option value="stock-asc">Menor Disponibilidad</option>
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
              </div>
            </div>

            <div id="catalogo-grid-section" className="flex flex-col gap-4 pt-1">
              {/* Encabezado del Catálogo */}
              <div className="flex items-end justify-between pt-1">
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">Catálogo de equipos</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Equipos y herramientas disponibles para solicitud en laboratorio.</p>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  Mostrando {filteredItems.length} {filteredItems.length === 1 ? 'producto' : 'productos'}
                </span>
              </div>

              {/* The Grid / List */}
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                : "flex flex-col gap-3"}>
                {loading && <div className="col-span-full py-16 text-center text-sm font-semibold text-gray-400">Cargando inventario…</div>}
                {!loading && error && (
                  <div className="col-span-full rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
                    <p className="text-sm font-bold text-red-700">No se pudo consultar el inventario.</p>
                    <button onClick={() => void fetchItems({ forzar: true })} className="mt-3 text-xs font-bold text-red-700 underline cursor-pointer">Reintentar</button>
                  </div>
                )}
                {!loading && !error && filteredItems.length === 0 && (
                  <div className="col-span-full py-16 text-center text-sm font-semibold text-gray-400">No hay equipos que coincidan con los filtros.</div>
                )}
                {!loading && !error && filteredItems.map((item) => {
                  const inCart = cart.find(c => c.id === item.id);
                  const qty = inCart ? inCart.qty : 0;
                  const isAvailable = item.estado === 'disponible' && item.stock > 0;
                  const isBookmarked = bookmarkedIds.has(item.id);

                  if (viewMode === 'list') {
                    // List View Item
                    return (
                      <div key={item.id} className={`flex items-center gap-4 bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all ${!isAvailable ? 'opacity-60' : ''}`}>
                        <img src={fotoDe(item)} className="w-20 h-20 rounded-xl object-cover shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[14px] font-extrabold text-gray-900 mb-1 truncate">{item.nombre}</h3>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">SN: {item.serie}</span>
                            <span className="text-[11px] font-medium text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{item.ubicacion}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-center px-4 border-r border-gray-100">
                            <p className="text-[9px] font-extrabold text-gray-400 uppercase">Disp.</p>
                            <p className="text-sm font-black text-gray-800">{item.stock}</p>
                          </div>
                          <div className="w-[130px] flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleBookmark(item.id)}
                              className={`p-2 rounded-lg border transition cursor-pointer ${
                                isBookmarked
                                  ? 'bg-red-50 border-red-200 text-red-600'
                                  : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                              }`}
                              title="Guardar equipo"
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-red-600' : ''}`} />
                            </button>
                            {isAvailable ? (
                              qty > 0 ? (
                                <div className="flex items-center justify-between bg-slate-100 rounded-lg p-0.5 h-[32px] border border-slate-200">
                                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-white shadow-xs flex items-center justify-center font-bold text-slate-700 hover:text-red-600 transition cursor-pointer">−</button>
                                  <span className="text-xs font-black text-slate-900 px-2">{qty}</span>
                                  <button onClick={() => updateQty(item.id, 1)} disabled={qty >= item.stock} className="w-6 h-6 rounded bg-white shadow-xs flex items-center justify-center font-bold text-slate-700 hover:text-emerald-600 transition disabled:opacity-40 cursor-pointer">+</button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => { addToCart(item.id); setCartOpen(true); }} 
                                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Send className="w-3 h-3 rotate-45" /> Solicitar
                                </button>
                              )
                            ) : (
                              <div className="px-3 py-1.5 bg-gray-50 text-gray-400 text-xs font-bold rounded-xl border border-gray-100">
                                Agotado
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Grid View Item (Diseño limpio idéntico al de arriba, 3 en fila)
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200/90 overflow-hidden hover:shadow-md transition duration-200 flex flex-col group relative"
                    >
                      {/* Imagen superior */}
                      <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                        <img
                          src={fotoDe(item)}
                          alt={item.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />

                        {/* Badges de categoría */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
                          <div className="pointer-events-auto">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs backdrop-blur-xs border ${getCategoryColor(item.categoria)}`}
                            >
                              {getCategoryIcon(item.categoria)}
                              <span className="capitalize">{getCategoryLabel(item.categoria)}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contenido de la tarjeta */}
                      <div className="p-3.5 flex flex-col flex-1">
                        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1" title={item.nombre}>
                          {item.nombre}
                        </h3>

                        <div className="flex items-center gap-1 text-slate-500 text-xs mt-1 mb-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.ubicacion}</span>
                        </div>

                        {/* Serial */}
                        <div className="mt-auto mb-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] border border-slate-200/60">
                            SN: {item.serie}
                          </span>
                        </div>

                        {/* Pie de tarjeta con disponibilidad y acciones */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <span className={`text-xs font-semibold ${isAvailable ? 'text-emerald-700' : 'text-red-700'}`}>
                              {item.stock} {item.stock === 1 ? 'disponible' : 'disponibles'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleBookmark(item.id)}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                isBookmarked
                                  ? 'bg-red-50 border-red-200 text-red-600'
                                  : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                              }`}
                              title="Guardar equipo"
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-red-600' : ''}`} />
                            </button>

                            {isAvailable ? (
                              qty > 0 ? (
                                <div className="flex items-center justify-between bg-slate-100 rounded-lg p-0.5 h-[30px] border border-slate-200">
                                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-white shadow-xs flex items-center justify-center font-bold text-slate-700 hover:text-red-600 transition cursor-pointer">−</button>
                                  <span className="text-xs font-black text-slate-900 px-2">{qty}</span>
                                  <button onClick={() => updateQty(item.id, 1)} disabled={qty >= item.stock} className="w-6 h-6 rounded bg-white shadow-xs flex items-center justify-center font-bold text-slate-700 hover:text-emerald-600 transition disabled:opacity-40 cursor-pointer">+</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { addToCart(item.id); setCartOpen(true); }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                                >
                                  <Send className="w-3 h-3 rotate-45" />
                                  <span>Solicitar</span>
                                </button>
                              )
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200">
                                Agotado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── SIDEBAR DERECHO (Actividad + Solicitudes) ──────────── */}
          <LabRightSidebar
            activityItems={itemsRecientes.slice(0, 5)}
            solicitudesRecientes={solicitudesSidebar}
            onViewAllRequests={() => navigate('/student/requests')}
            onSelectItem={handleSelectItem}
          />

        </div>
      </div>

      {/* CARRITO (RIGHT PANEL) */}
      <div className={`bg-white border-l border-gray-200/80 flex flex-col shrink-0 transition-all duration-300 overflow-hidden relative ${cartOpen ? 'w-[360px] opacity-100 pointer-events-auto shadow-2xl' : 'w-0 opacity-0 pointer-events-none'}`}>
        <AcentoTarjeta />

        <div className="p-5 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0 mt-1 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-espoch-red flex items-center justify-center text-white shadow-sm">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-extrabold text-gray-900 leading-tight">Mi Solicitud</h3>
              <p className="text-[10px] text-gray-400 font-semibold">{cart.reduce((sum, c) => sum + c.qty, 0)} ítems seleccionados</p>
            </div>
          </div>
          <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white relative">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 h-full">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 opacity-30" />
              </div>
              <p className="text-sm font-bold text-gray-500">Carrito vacío</p>
              <p className="text-[11px] text-gray-400 mt-1 text-center px-4">Agrega equipos desde el catálogo para iniciar tu solicitud.</p>
            </div>
          ) : (
            cart.map(c => {
              const item = catalogoData.find(i => i.id === c.id);
              if (!item) return null;
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100 group/item hover:border-gray-200 transition-all">
                  <img src={fotoDe(item)} className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-gray-900 truncate leading-tight">{item.nombre}</p>
                    <p className="text-[9px] text-gray-400 font-mono">SN: {item.serie}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors text-xs font-bold">−</button>
                      <span className="text-xs font-black text-gray-900 w-5 text-center">{c.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} disabled={c.qty >= item.stock} className={`w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-green-50 hover:text-green-500 hover:border-green-200 transition-colors text-xs font-bold ${c.qty >= item.stock ? 'opacity-30' : ''}`}>+</button>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="p-5 border-t border-gray-100 bg-white shrink-0 space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Asignatura *</label>
            {/* Con la malla cargada se elige de una lista; escribir a mano el nombre de una
                materia produce grafías distintas para la misma asignatura. Si el estudiante no
                tiene carrera o PAO asignados, o su nivel aún no tiene materias, se deja el campo
                libre: quedarse sin poder pedir un equipo es peor que un nombre escrito a mano. */}
            {materiasDelPao.length > 0 ? (
              <select value={idMateria} onChange={e => setIdMateria(e.target.value)} className="bg-white text-[13px] text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/60 focus:ring-2 focus:ring-espoch-yellow/10 font-medium appearance-none cursor-pointer transition-all">
                <option value="">Selecciona la asignatura…</option>
                {materiasDelPao.map(materia => (
                  <option key={materia.id} value={materia.id}>{materia.nombre}</option>
                ))}
              </select>
            ) : (
              <input type="text" value={asignaturaLibre} onChange={e => setAsignaturaLibre(e.target.value)} placeholder="Ej: Circuitos Eléctricos I" className="bg-white text-[13px] text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/60 focus:ring-2 focus:ring-espoch-yellow/10 font-medium placeholder:text-gray-300 transition-all" />
            )}
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Tipo Movimiento</label>
              <select value={tipoMovimiento} onChange={e => setTipoMovimiento(e.target.value)} className="bg-white text-[13px] text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/60 focus:ring-2 focus:ring-espoch-yellow/10 font-medium appearance-none cursor-pointer transition-all">
                <option value="Sacar">Sacar</option>
                <option value="Devolver">Devolver</option>
                <option value="Préstamo">Préstamo</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Fecha</label>
              <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="bg-white text-[13px] text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/60 focus:ring-2 focus:ring-espoch-yellow/10 font-medium transition-all" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Observaciones</label>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Práctica de laboratorio, uso personal, etc." className="bg-white text-[13px] text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/60 focus:ring-2 focus:ring-espoch-yellow/10 font-medium resize-none placeholder:text-gray-300 transition-all"></textarea>
          </div>

          {ultimoComprobante && (
            <button
              onClick={() => generarPDFComprobante(ultimoComprobante)}
              className="w-full py-2.5 rounded-full border border-gray-200 text-[11.5px] font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> Descargar comprobante {ultimoComprobante.numeroSolicitud}
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={clearCart} disabled={enviando} className="flex-1 py-3 rounded-full border border-gray-200 text-[12px] font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <Trash className="w-4 h-4" /> LIMPIAR
            </button>
            <button onClick={enviarSolicitud} disabled={enviando} className="flex-[2] py-3 rounded-full bg-espoch-red hover:bg-espoch-darkred disabled:opacity-60 disabled:cursor-not-allowed text-white text-[12px] font-bold flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(176,0,0,0.4)] hover:shadow-[0_0_18px_rgba(176,0,0,0.6)] transition-all transform hover:-translate-y-0.5 border border-red-500/30">
              <FileText className="w-4 h-4" /> {enviando ? 'ENVIANDO…' : 'SOLICITAR'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
