import { useState, useMemo, useEffect } from 'react';
import { Wrench, Plus, X, Clock, Loader, CheckCircle, MapPin, Trash2, RotateCcw } from 'lucide-react';
import { useMantenimientoStore } from '../../../store/mantenimientoStore';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import { useUsuariosStore } from '../../../store/usuariosStore';
import type { EstadoOT, PrioridadOT } from '../data/mantenimientoData';
import { hoy } from '../../../lib/utils';
import { PageHero } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/ui/Pagination';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Badge } from '../../../components/ui/Badge';
import { FilterDropdown } from '../../../components/ui/FilterDropdown';
import { AcentoTarjeta } from '../../../components/ui/AcentoTarjeta';

type TabKey = 'todas' | EstadoOT;

const estadoBadge = (estado: EstadoOT) => {
  if (estado === 'pendiente') return <Badge color="amber" icon={Clock}>Pendiente</Badge>;
  if (estado === 'en_proceso') return <Badge color="blue" icon={Loader}>En proceso</Badge>;
  return <Badge color="green" icon={CheckCircle}>Resuelto</Badge>;
};

const prioridadBadge = (p: PrioridadOT) => (
  <Badge color={p === 'alta' ? 'red' : p === 'media' ? 'amber' : 'slate'} pill dot>
    <span className="capitalize">{p}</span>
  </Badge>
);

export const Mantenimiento = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const ordenes = useMantenimientoStore(s => s.ordenes);
  const fetchOrdenes = useMantenimientoStore(s => s.fetchOrdenes);
  const addOrden = useMantenimientoStore(s => s.addOrden);
  const updateOrden = useMantenimientoStore(s => s.updateOrden);
  const removeOrden = useMantenimientoStore(s => s.removeOrden);
  const items = useInventarioStore(s => s.items);
  const fetchItems = useInventarioStore(s => s.fetchItems);
  const espacios = useEspaciosStore(s => s.items);
  const fetchEspacios = useEspaciosStore(s => s.fetchEspacios);
  const edificios = useEdificiosStore(s => s.items);
  const fetchEdificios = useEdificiosStore(s => s.fetchEdificios);
  
  const usuarios = useUsuariosStore(s => s.items);
  const fetchUsuarios = useUsuariosStore(s => s.fetchUsuarios);

  useEffect(() => {
    fetchOrdenes();
    fetchItems();
    fetchEspacios();
    fetchEdificios();
    fetchUsuarios();
  }, []);

  const tecnicosDb = useMemo(() => usuarios.filter(u => {
    const rol = ((u as any).roles?.nombre || '').toLowerCase();
    return u.id_rol === 3 || rol.includes('tecnic') || rol.includes('técnic');
  }), [usuarios]);

  const tecnicoById = (id: string | null | undefined) => tecnicosDb.find(t => t.id === id);

  const mappedOrdenes = useMemo(() => {
    return ordenes.map(o => {
      const item = items.find(i => i.id === o.id_inventario);
      const espacio = item ? espacios.find(e => e.id === item.id_espacio) : null;
      return {
        ...o,
        recursoNombre: item?.nombre || 'Ítem desconocido',
        categoria: item?.categoria || 'desconocido',
        ubicacion: espacio ? `${espacio.id_edificio} · ${espacio.nombre}` : 'Sin ubicación',
      };
    });
  }, [ordenes, items, espacios]);

  const [activeTab, setActiveTab] = useState<TabKey>('todas');
  const [search, setSearch] = useState('');
  const [prioridadFilter, setPrioridadFilter] = useState('todas');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;
  const [modalType, setModalType] = useState<null | 'create' | 'delete' | 'bulkDelete'>(null);
  const [selected, setSelected] = useState<any>(null);

  // Selección múltiple (mismo patrón que Inventario)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  useEffect(() => { setSelectedIds([]); }, [activeTab, search, prioridadFilter]);

  const defaultForm = { recursoId: '', descripcion: '', prioridad: 'media' as PrioridadOT, tecnicoId: '' };
  const [form, setForm] = useState(defaultForm);

  const kpis = useMemo(() => ({
    total: mappedOrdenes.length,
    pendientes: mappedOrdenes.filter(o => o.estado === 'pendiente').length,
    enProceso: mappedOrdenes.filter(o => o.estado === 'en_proceso').length,
    resueltas: mappedOrdenes.filter(o => o.estado === 'resuelto').length,
  }), [mappedOrdenes]);

  const filtered = useMemo(() => {
    let result = activeTab === 'todas' ? [...mappedOrdenes] : mappedOrdenes.filter(o => o.estado === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.recursoNombre.toLowerCase().includes(q) ||
        o.descripcion.toLowerCase().includes(q) ||
        o.ubicacion.toLowerCase().includes(q)
      );
    }
    if (prioridadFilter !== 'todas') {
      result = result.filter(o => o.prioridad === prioridadFilter);
    }
    return result;
  }, [mappedOrdenes, activeTab, search, prioridadFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (currentPage - 1) * perPage;
  const pageData = filtered.slice(start, start + perPage);

  const tabItems = [
    { key: 'todas' as TabKey, label: 'Todas', count: mappedOrdenes.length, icon: Wrench },
    { key: 'pendiente' as TabKey, label: 'Pendientes', count: kpis.pendientes, icon: Clock },
    { key: 'en_proceso' as TabKey, label: 'En proceso', count: kpis.enProceso, icon: Loader },
    { key: 'resuelto' as TabKey, label: 'Resueltas', count: kpis.resueltas, icon: CheckCircle },
  ];

  const handleEstado = async (id: string, estado: EstadoOT) => {
    await updateOrden(id, { estado });
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(i => i.id === form.recursoId);
    if (!item) return;
    const espacio = espacios.find(e => e.id === item.id_espacio);
    try {
      await addOrden({
        id: 'OT' + Date.now(),
        id_inventario: item.id,
        recurso_nombre: item.nombre,
        categoria: item.categoria,
        ubicacion: espacio?.nombre || 'Sin ubicación',
        descripcion: form.descripcion,
        prioridad: form.prioridad,
        estado: 'pendiente',
        id_tecnico: form.tecnicoId || null,
        fecha_reporte: hoy(),
      });
      setForm(defaultForm);
      setModalType(null);
    } catch (err: any) {
      import('sweetalert2').then(Swal => {
        Swal.default.fire('Error', 'No se pudo crear la orden: ' + (err.message || 'Error desconocido'), 'error');
      });
    }
  };

  const handleDelete = async () => {
    if (selected) {
      await removeOrden(selected.id);
      setModalType(null);
      setSelected(null);
    }
  };

  const handleBulkDelete = async () => {
    await Promise.all(selectedIds.map(id => removeOrden(id)));
    setSelectedIds([]);
    setModalType(null);
  };

  const handleBulkResolver = async () => {
    await Promise.all(selectedIds.map(id => updateOrden(id, { estado: 'resuelto' })));
    setSelectedIds([]);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      {!embedded && (
        <PageHero
          icon={Wrench}
          title="Mantenimiento"
          subtitle="Órdenes de trabajo y reparación de recursos."
          backgroundImage={HERO_BG.mantenimiento}
          stats={[
            { Icon: Wrench, value: kpis.total, label: 'Total' },
            { Icon: Clock, value: kpis.pendientes, label: 'Pendientes' },
            { Icon: Loader, value: kpis.enProceso, label: 'En proceso' },
            { Icon: CheckCircle, value: kpis.resueltas, label: 'Resueltas' },
          ]}
        />
      )}

      <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0 animate-fade-in flex flex-col">
        <div className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative overflow-hidden flex-1 min-h-0">
          <AcentoTarjeta />

          {/* TOOLBAR */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0 pt-2">
            <div className="flex items-center gap-3 flex-wrap flex-1 w-full xl:w-auto">
              <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1); }} placeholder="Buscar orden, recurso..." className="w-[200px] sm:w-[240px] shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <FilterDropdown
                  icon={Wrench}
                  label="Estado"
                  value={activeTab}
                  options={tabItems.map(t => ({ key: t.key, label: `${t.label} (${t.count})` }))}
                  onChange={(k) => { setActiveTab(k as TabKey); setCurrentPage(1); }}
                />
                <FilterDropdown
                  label="Prioridad"
                  value={prioridadFilter}
                  options={[
                    { key: 'todas', label: 'Todas' },
                    { key: 'alta', label: 'Alta' },
                    { key: 'media', label: 'Media' },
                    { key: 'baja', label: 'Baja' },
                  ]}
                  onChange={(k) => { setPrioridadFilter(k); setCurrentPage(1); }}
                />
                <button 
                  onClick={() => { setSearch(''); setActiveTab('todas'); setPrioridadFilter('todas'); setCurrentPage(1); }}
                  className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium hover:text-gray-700 transition-colors ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar filtros
                </button>
              </div>
            </div>
            <button onClick={() => { setForm(defaultForm); setModalType('create'); }} className="bg-espoch-ink hover:bg-black text-white font-bold text-xs px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg transition-all border border-gray-800 shrink-0">
              <Plus className="w-3.5 h-3.5" /> Nueva Orden
            </button>
          </div>

          {/* Barra de acción masiva */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between gap-3 mb-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 animate-fade-in shrink-0">
              <span className="text-[12px] font-bold text-red-700">{selectedIds.length} seleccionada{selectedIds.length > 1 ? 's' : ''}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIds([])} className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 px-2">Cancelar</button>
                <button onClick={handleBulkResolver} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-sm transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" /> Marcar resueltas ({selectedIds.length})
                </button>
                <button onClick={() => setModalType('bulkDelete')} className="flex items-center gap-1.5 bg-espoch-red hover:bg-espoch-darkred text-white text-[12px] font-bold px-4 py-2 rounded-full shadow-sm transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.length})
                </button>
              </div>
            </div>
          )}

          {/* TABLA */}
          <div className="w-full overflow-auto flex-1 flex flex-col min-h-0 relative custom-scrollbar border border-gray-100 rounded-xl">
            <div className="min-w-[1020px] grid grid-cols-[40px_1.4fr_1.2fr_0.8fr_1.1fr_1fr_0.8fr_50px] gap-4 px-4 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10 pt-3">
              <div className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={pageData.length > 0 && pageData.every(o => selectedIds.includes(o.id))}
                  onChange={() => {
                    if (pageData.every(o => selectedIds.includes(o.id)) && pageData.length > 0) setSelectedIds(prev => prev.filter(id => !pageData.some(o => o.id === id)));
                    else setSelectedIds(prev => [...new Set([...prev, ...pageData.map(o => o.id)])]);
                  }}
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-red cursor-pointer"
                />
              </div>
              <div>Recurso / Problema</div>
              <div>Ubicación</div>
              <div>Prioridad</div>
              <div>Técnico</div>
              <div>Estado</div>
              <div>Reporte</div>
              <div className="text-right">—</div>
            </div>

            <div className="flex flex-col min-w-[1020px]">
              {pageData.map((o, i) => (
                <div key={o.id} className={`grid grid-cols-[40px_1.4fr_1.2fr_0.8fr_1.1fr_1fr_0.8fr_50px] gap-4 px-4 py-3 border-b border-gray-50 transition-colors items-center animate-fade-in ${selectedIds.includes(o.id) ? 'bg-red-50/40' : 'hover:bg-gray-50/50'}`} style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center justify-center">
                    <input type="checkbox" checked={selectedIds.includes(o.id)} onChange={() => toggleSelect(o.id)} className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-red cursor-pointer" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-gray-900 truncate">{o.recursoNombre}</span>
                    <span className="text-[10px] text-gray-400 truncate">{o.descripcion}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
                    <span className="text-[10.5px] text-gray-600 truncate">{o.ubicacion}</span>
                  </div>
                  <div>{prioridadBadge(o.prioridad as PrioridadOT)}</div>

                  <div className="flex items-center gap-2 min-w-0">
                    {o.id_tecnico && <img src={tecnicoById(o.id_tecnico)?.avatar_url ?? ''} className="w-6 h-6 rounded-full border border-gray-200 shrink-0" alt="" />}
                    <select value={o.id_tecnico ?? ''} onChange={(e) => updateOrden(o.id, { id_tecnico: e.target.value || null })} className="bg-transparent text-[11px] font-semibold text-gray-700 outline-none cursor-pointer min-w-0 truncate hover:text-gray-900">
                      <option value="">Sin asignar</option>
                      {tecnicosDb.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {estadoBadge(o.estado as EstadoOT)}
                    <select value={o.estado} onChange={(e) => handleEstado(o.id, e.target.value as EstadoOT)} className="bg-transparent text-[10px] font-bold text-gray-400 outline-none cursor-pointer hover:text-gray-700" title="Cambiar estado">
                      <option value="pendiente">Pendiente</option>
                      <option value="en_proceso">En proceso</option>
                      <option value="resuelto">Resuelto</option>
                    </select>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10.5px] font-semibold text-gray-600">{o.fecha_reporte}</span>
                    {o.fecha_cierre && <span className="text-[9px] text-green-500">✓ {o.fecha_cierre}</span>}
                  </div>

                  <div className="flex justify-end">
                    <button onClick={() => { setSelected(o); setModalType('delete'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              {pageData.length === 0 && (
                <EmptyState
                  icon={Wrench}
                  title={ordenes.length === 0 ? 'Sin órdenes de trabajo' : 'Sin órdenes en esta vista'}
                  description={ordenes.length === 0 ? 'Reporta el primer recurso que requiera reparación.' : undefined}
                  actionLabel={ordenes.length === 0 ? 'Nueva Orden' : undefined}
                  onAction={ordenes.length === 0 ? () => { setForm(defaultForm); setModalType('create'); } : undefined}
                  secondaryLabel={ordenes.length > 0 ? 'Limpiar filtros' : undefined}
                  onSecondary={ordenes.length > 0 ? () => { setSearch(''); setActiveTab('todas'); setPrioridadFilter('todas'); setCurrentPage(1); } : undefined}
                />
              )}
            </div>
          </div>

          <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} total={filtered.length} perPage={perPage} />
        </div>
      </div>

      {/* MODAL CREAR */}
      {modalType === 'create' && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-[560px] relative animate-scale-in flex flex-col p-8">
            <button onClick={() => setModalType(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"><X className="w-5 h-5"/></button>
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Nueva Orden de Trabajo</h3>
            <p className="text-xs text-gray-500 mb-6">Reporte un recurso que requiere reparación o mantenimiento.</p>

            <form onSubmit={handleCrear} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Recurso afectado</label>
                <select required value={form.recursoId} onChange={e => setForm({ ...form, recursoId: e.target.value })} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                  <option value="">Seleccione un ítem del inventario...</option>
                  {items.map(it => {
                    const esp = espacios.find(e => e.id === it.id_espacio);
                    const edif = edificios.find(ed => ed.id === esp?.id_edificio);
                    const ubicacionStr = esp ? `${edif?.nombre || esp.id_edificio} (${esp.nombre})` : 'Sin ubicación';
                    return <option key={it.id} value={it.id}>{it.nombre} — {ubicacionStr}</option>;
                  })}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Descripción del problema</label>
                <textarea required rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Describa la falla..." className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium resize-none"></textarea>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Prioridad</label>
                  <select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value as PrioridadOT })} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Técnico (opcional)</label>
                  <select value={form.tecnicoId} onChange={e => setForm({ ...form, tecnicoId: e.target.value })} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                    <option value="">Sin asignar</option>
                    {tecnicosDb.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button type="submit" className="bg-espoch-ink hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all border border-gray-800">Crear Orden</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={modalType === 'delete'}
        title="Eliminar Orden"
        message={<>¿Eliminar la orden de <b>{selected?.recursoNombre}</b>? Esta acción no se puede deshacer.</>}
        onConfirm={handleDelete}
        onCancel={() => setModalType(null)}
      />
      <ConfirmDialog
        open={modalType === 'bulkDelete'}
        title={`Eliminar ${selectedIds.length} órdenes`}
        message={<>Se eliminarán permanentemente las <b>{selectedIds.length}</b> órdenes seleccionadas. Esta acción no se puede deshacer.</>}
        onConfirm={handleBulkDelete}
        onCancel={() => setModalType(null)}
      />
    </div>
  );
};
