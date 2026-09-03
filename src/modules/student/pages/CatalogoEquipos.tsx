import { useState, useMemo, useEffect } from 'react';
import { MonitorSpeaker, Search, ChevronDown, LayoutGrid, List, PenTool, Wrench, Settings, Sofa, Monitor, MapPin, Package, Plus, X, ClipboardList, Trash, FileText, Trash2, CheckCircle2 } from 'lucide-react';
import { useCatalogoEquiposStore } from '../../../store/catalogoEquiposStore';
import { useCartStore } from '../../../store/cartStore';
import { FirmaModal } from '../components/FirmaModal';
import { generarPDFComprobante } from '../../../utils/pdfGenerator';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';

export const CatalogoEquipos = () => {
  const { cart, cartOpen, setCartOpen, addToCart, updateQty, removeFromCart, clearCart } = useCartStore();
  const { items: catalogoData, fetchItems } = useCatalogoEquiposStore();
  const authUser = useAuthStore(s => s.user);
  const [search, setSearch] = useState('');

  // La BD guarda las imágenes en fotos_json (array). Devuelve la primera o un placeholder.
  const fotoDe = (it: any): string => {
    const f = it?.fotos_json;
    return (Array.isArray(f) ? f[0] : f) || '/background.png';
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  
  // Filters
  const [catFilters, setCatFilters] = useState<string[]>([]);
  const [stockFilters, setStockFilters] = useState<string[]>([]);
  const [labFilters, setLabFilters] = useState<string[]>([]);
  const [marcaFilters, setMarcaFilters] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState('name-asc');
  
  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form State
  const [asignatura, setAsignatura] = useState('');
  const [tipoMovimiento, setTipoMovimiento] = useState('Sacar');
  const [observaciones, setObservaciones] = useState('');

  // Modals
  const [firmaModalOpen, setFirmaModalOpen] = useState(false);

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
  const clearCatalogFilters = () => {
    setCatFilters([]); setStockFilters([]); setLabFilters([]); setMarcaFilters([]);
  };

  const getCategoryIcon = (cat: string) => {
    if (cat === 'herramientas') return <Wrench className="w-3.5 h-3.5" />;
    if (cat === 'equipos') return <Settings className="w-3.5 h-3.5" />;
    if (cat === 'mobiliario') return <Sofa className="w-3.5 h-3.5" />;
    return <Monitor className="w-3.5 h-3.5" />;
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === 'herramientas') return 'Herramienta';
    if (cat === 'equipos') return 'Equipo';
    if (cat === 'mobiliario') return 'Mobiliario';
    return 'Tecnológico';
  };

  const getCategoryColor = (cat: string) => {
    if (cat === 'herramientas') return 'text-amber-600';
    if (cat === 'equipos') return 'text-blue-600';
    if (cat === 'mobiliario') return 'text-indigo-600';
    return 'text-purple-600';
  };

  const generarPDF = async () => {
    if (cart.length === 0) {
      alert('Agregue al menos un ítem al carrito.');
      return;
    }

    if (!asignatura.trim()) {
      alert('Por favor ingrese la asignatura antes de solicitar.');
      return;
    }

    const firma = localStorage.getItem('espoch_student_firma');
    if (!firma) {
      setFirmaModalOpen(true);
      return;
    }

    const now = new Date();
    const fechaStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const solNum = `SOL-${now.getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
    
    // Ítems con id del catálogo (la BD exige la key id_equipo en cada item).
    const solItems = cart.map((c) => {
      const item = catalogoData.find(i => i.id === c.id);
      return {
        id_equipo: item?.id || c.id,
        nombre: item?.nombre || '',
        serie: item?.serie || '',
        categoria: item?.categoria || '',
        cantidad: c.qty,
      };
    });

    const pdfItems = solItems.map((it) => ({
      nombre: it.nombre,
      serie: it.serie,
      categoria: getCategoryLabel(it.categoria),
      cantidad: it.cantidad,
    }));

    generarPDFComprobante({
      numeroSolicitud: solNum.replace('SOL-', ''),
      fecha: fechaStr,
      nombre: authUser?.nombre || 'Estudiante',
      cedula: '0604789123',
      carrera: 'Ingeniería en Electricidad',
      asignatura,
      tipoMovimiento,
      items: pdfItems
    });

    // Persistir la solicitud en la BD para que el admin pueda aprobarla -> préstamo.
    try {
      const { error } = await supabase.from('solicitudes_equipo').insert([{
        numero: solNum,
        id_usuario: authUser?.id ?? null,
        id_materia: null,
        fecha: now.toISOString().slice(0, 10),
        hora: now.toTimeString().slice(0, 5),
        estado: 'Pendiente',
        items: solItems,
        observacion: [asignatura, observaciones].filter(Boolean).join(' · ') || null,
      }] as any);
      if (error) throw error;
    } catch (err: any) {
      console.error('Error guardando solicitud de equipo:', err?.message || err, err);
    }

    clearCart();
    setAsignatura('');
    setObservaciones('');
    setCartOpen(false);
  };

  return (
    <div className="flex-1 flex min-h-0 relative overflow-hidden h-full">
      <FirmaModal isOpen={firmaModalOpen} onClose={() => setFirmaModalOpen(false)} onSave={() => {}} />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 bg-[#f4f7fb]">
        
        {/* HERO SECTION — consistente con el banner admin (PageHero) */}
        <div className="w-full min-h-[120px] bg-espoch-hero relative flex items-center px-6 lg:px-12 shrink-0 overflow-hidden shadow-sm py-5 border-b border-gray-800">
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
                <h2 className="text-[21px] md:text-[25px] font-bold text-white tracking-tight leading-none mb-1.5">
                  Catálogo de Equipos
                </h2>
                <p className="text-[13px] text-gray-400 font-medium">Explora, filtra y solicita el equipo que necesitas para tus prácticas.</p>
              </div>
            </div>

            <div className="flex items-center gap-6 bg-espoch-herocard rounded-xl px-6 py-3 border border-white/5 shadow-inner hidden md:flex">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">842</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Total equipos</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>
              
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">615</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Disponibles</span>
                </div>
              </div>
              
              <div className="w-px h-8 bg-white/10 mx-1"></div>

              <div className="flex items-center gap-3">
                <Wrench className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="text-[15px] font-black text-white leading-tight">12</span>
                  <span className="text-[10px] font-medium text-gray-400 leading-none">Mantenimiento</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 flex w-full p-6 lg:p-10 gap-8 items-start overflow-hidden">
          
          {/* SIDEBAR FILTROS */}
          <aside className="w-[240px] shrink-0 hidden lg:flex flex-col gap-6 bg-white/70 backdrop-blur-xl border border-gray-200/60 shadow-sm rounded-2xl p-5 h-full overflow-y-auto">

            {/* Header filtros + limpiar */}
            <div className="flex items-center justify-between border-b border-gray-200/80 pb-2 -mb-2">
              <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-wider">Filtros</h3>
              <button
                onClick={clearCatalogFilters}
                disabled={filtrosActivos === 0}
                className="text-[12px] font-bold text-espoch-red hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed transition-colors"
              >
                Limpiar{filtrosActivos > 0 ? ` (${filtrosActivos})` : ''}
              </button>
            </div>

            {/* Categorías */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-wider">Categorías</h3>
              </div>
              <div className="flex flex-col gap-3">
                {['herramientas', 'equipos', 'tecnologico'].map(cat => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="peer sr-only" checked={catFilters.includes(cat)} onChange={() => toggleFilter(setCatFilters, cat)} />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shadow-sm shrink-0 ${catFilters.includes(cat) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300'}`}>
                      {catFilters.includes(cat) && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                    </div>
                    <span className="text-[13.5px] font-semibold text-gray-600 group-hover:text-gray-900 capitalize">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Disponibilidad */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-wider">Disponibilidad</h3>
              </div>
              <div className="flex flex-col gap-3">
                {['disponible', 'agotado'].map(stock => (
                  <label key={stock} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="peer sr-only" checked={stockFilters.includes(stock)} onChange={() => toggleFilter(setStockFilters, stock)} />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shadow-sm shrink-0 ${stockFilters.includes(stock) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300'}`}>
                      {stockFilters.includes(stock) && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                    </div>
                    <span className="text-[13.5px] font-semibold text-gray-600 group-hover:text-gray-900 capitalize">{stock === 'disponible' ? 'En stock' : 'Agotado'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Laboratorio */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-wider">Laboratorio</h3>
              </div>
              <div className="flex flex-col gap-3">
                {['Circuitos', 'Control', 'Potencia', 'Electrónica'].map(lab => (
                  <label key={lab} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="peer sr-only" checked={labFilters.includes(lab)} onChange={() => toggleFilter(setLabFilters, lab)} />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shadow-sm shrink-0 ${labFilters.includes(lab) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300'}`}>
                      {labFilters.includes(lab) && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                    </div>
                    <span className="text-[13.5px] font-semibold text-gray-600 group-hover:text-gray-900 capitalize">{lab}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Marca */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
                <h3 className="text-[13px] font-black text-gray-900 uppercase tracking-wider">Marca</h3>
              </div>
              <div className="flex flex-col gap-3">
                {['Fluke', 'Tektronix', 'Siemens', 'HP', 'Cisco'].map(marca => (
                  <label key={marca} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="peer sr-only" checked={marcaFilters.includes(marca)} onChange={() => toggleFilter(setMarcaFilters, marca)} />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shadow-sm shrink-0 ${marcaFilters.includes(marca) ? 'bg-espoch-red border-espoch-red' : 'border-gray-300'}`}>
                      {marcaFilters.includes(marca) && <div className="w-[3px] h-[7px] border-white border-r-2 border-b-2 transform rotate-45 -translate-y-[1px]"></div>}
                    </div>
                    <span className="text-[13.5px] font-semibold text-gray-600 group-hover:text-gray-900 capitalize">{marca}</span>
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
                  placeholder="Buscar por nombre o serie..."
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
                    <option value="stock-desc">Mayor Disponibilidad</option>
                    <option value="stock-asc">Menor Disponibilidad</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>

                <div className="hidden sm:block w-px h-6 bg-gray-200 shrink-0"></div>
                
                <span className="hidden sm:block text-[12px] font-extrabold text-gray-500 uppercase tracking-wider shrink-0">{filteredItems.length} PRODUCTOS</span>
                
                <div className="hidden sm:flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shrink-0">
                  <button onClick={() => setViewMode('grid')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${viewMode === 'list' ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-50'}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <button 
                  onClick={() => setFirmaModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 text-[12px] font-bold text-gray-600 bg-white hover:text-espoch-red hover:border-espoch-red/30 hover:shadow-md transition-all shrink-0"
                >
                  <PenTool className="w-4 h-4" />
                  <span className="hidden sm:inline">Firma</span>
                </button>
              </div>
            </div>

            {/* The Grid / List */}
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
                : "flex flex-col gap-3"}>
                {filteredItems.map((item) => {
                  const inCart = cart.find(c => c.id === item.id);
                  const qty = inCart ? inCart.qty : 0;
                  const isAvailable = item.estado === 'disponible' && item.stock > 0;

                  if (viewMode === 'list') {
                    // List View Item
                    return (
                      <div key={item.id} className={`flex items-center gap-4 bg-white rounded-2xl p-3 border border-gray-200 shadow-sm hover:shadow-md transition-all ${!isAvailable ? 'opacity-60' : ''}`}>
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
                          <div className="w-[120px]">
                            {isAvailable ? (
                              qty > 0 ? (
                                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm">
                                  <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-red-100 hover:text-red-600 transition-colors font-bold text-sm">−</button>
                                  <span className="text-sm font-black text-gray-900">{qty}</span>
                                  <button onClick={() => updateQty(item.id, 1)} disabled={qty >= item.stock} className={`w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-green-100 hover:text-green-600 transition-colors font-bold text-sm ${qty >= item.stock ? 'opacity-50' : ''}`}>+</button>
                                </div>
                              ) : (
                                <button onClick={() => addToCart(item.id)} className="w-full py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-900 text-[12px] font-extrabold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5">
                                  <Plus className="w-3.5 h-3.5" /> Solicitar
                                </button>
                              )
                            ) : (
                              <div className="w-full py-2.5 bg-gray-50 text-gray-400 text-[12px] font-extrabold rounded-xl flex items-center justify-center gap-1.5 border border-gray-100">
                                <X className="w-3.5 h-3.5" /> Agotado
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Grid View Item
                  return (
                    <div key={item.id} className="group relative rounded-[20px] shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] transition-all duration-300 overflow-hidden flex flex-col h-[260px] bg-[#1a1f26]">
                      {/* Full Background Image */}
                      <img src={fotoDe(item)} alt={item.nombre} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 opacity-80 group-hover:opacity-90 transition-opacity duration-300"></div>

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-10">
                        <div className={`bg-white ${getCategoryColor(item.categoria)} text-[9px] font-extrabold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5`}>
                          {getCategoryIcon(item.categoria)}
                          {getCategoryLabel(item.categoria)}
                        </div>
                      </div>

                      {/* Contenido Inferior (Glassmorphism) */}
                      <div className="absolute bottom-2 left-2 right-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex flex-col z-10 text-white shadow-lg">
                        <h3 className="text-[12px] font-extrabold leading-tight mb-1 line-clamp-2">{item.nombre}</h3>
                        
                        <div className="flex items-center justify-between mt-1 mb-3">
                          <p className="text-[9px] font-medium text-gray-200 flex items-center gap-1 truncate max-w-[60%]">
                            <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{item.ubicacion}</span>
                          </p>
                          <p className="text-[8px] font-mono text-gray-300 bg-black/40 px-1 py-0.5 rounded text-right tracking-wider uppercase shrink-0">SN: {item.serie}</p>
                        </div>

                        {/* Botón Agregar / Contador */}
                        <div className="flex items-center justify-between gap-2 mt-auto">
                          <div className="text-[10px] font-black text-gray-100 flex flex-col justify-center bg-black/30 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 h-[34px] shrink-0 min-w-[70px]">
                            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Disponibles</span>
                            <div className="flex items-center gap-1.5 leading-none">
                              <Package className="w-3.5 h-3.5" /> {item.stock}
                            </div>
                          </div>

                          <div className="flex-1 h-[34px]">
                            {isAvailable ? (
                              qty > 0 ? (
                                <div className="flex items-center justify-between bg-white/95 rounded-lg p-1 border border-white/50 backdrop-blur-md shadow-sm h-full">
                                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-md bg-gray-100 shadow-sm flex items-center justify-center text-gray-700 hover:bg-red-100 hover:text-red-600 transition-colors font-bold text-sm leading-none">−</button>
                                  <span className="text-xs font-black text-gray-900">{qty}</span>
                                  <button onClick={() => updateQty(item.id, 1)} disabled={qty >= item.stock} className={`w-6 h-6 rounded-md bg-gray-100 shadow-sm flex items-center justify-center text-gray-700 hover:bg-green-100 hover:text-green-600 transition-colors font-bold text-sm leading-none ${qty >= item.stock ? 'opacity-50 cursor-not-allowed' : ''}`}>+</button>
                                </div>
                              ) : (
                                <button onClick={() => addToCart(item.id)} className="w-full h-full bg-white hover:bg-gray-50 text-gray-900 text-[10px] font-extrabold rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5">
                                  <Plus className="w-3.5 h-3.5" /> Solicitar
                                </button>
                              )
                            ) : (
                              <div className="w-full h-full bg-white/20 text-white/80 text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1.5 backdrop-blur-md border border-white/10">
                                <X className="w-3.5 h-3.5" /> Agotado
                              </div>
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
        </div>
      </div>

      {/* CARRITO (RIGHT PANEL) */}
      <div className={`bg-white border-l border-gray-200/80 flex flex-col shrink-0 transition-all duration-300 overflow-hidden relative ${cartOpen ? 'w-[360px] opacity-100 pointer-events-auto shadow-2xl' : 'w-0 opacity-0 pointer-events-none'}`}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-espoch-yellow via-orange-400 to-espoch-red opacity-90"></div>

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
            <input type="text" value={asignatura} onChange={e => setAsignatura(e.target.value)} placeholder="Ej: Circuitos Eléctricos I" className="bg-white text-[13px] text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/60 focus:ring-2 focus:ring-espoch-yellow/10 font-medium placeholder:text-gray-300 transition-all" />
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

          <div className="flex gap-3 pt-2">
            <button onClick={clearCart} className="flex-1 py-3 rounded-full border border-gray-200 text-[12px] font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
              <Trash className="w-4 h-4" /> LIMPIAR
            </button>
            <button onClick={generarPDF} className="flex-[2] py-3 rounded-full bg-espoch-red hover:bg-espoch-darkred text-white text-[12px] font-bold flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(176,0,0,0.4)] hover:shadow-[0_0_18px_rgba(176,0,0,0.6)] transition-all transform hover:-translate-y-0.5 border border-red-500/30">
              <FileText className="w-4 h-4" /> SOLICITAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
