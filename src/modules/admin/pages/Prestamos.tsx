import { useState, useMemo, useEffect } from 'react';
import { ArrowLeftRight, Plus, X, Clock, CheckCircle, AlertTriangle, Trash2, User, Package, Calendar, RotateCcw, Download } from 'lucide-react';
import { usePrestamosStore } from '../../../store/prestamosStore';
import { useCatalogoEquiposStore } from '../../../store/catalogoEquiposStore';
import { useSolicitudesEquipoAdminStore } from '../../../store/solicitudesEquipoAdminStore';
import { esAtrasado, type Prestamo } from '../data/prestamosData';
import { hoy } from '../../../lib/utils';
import { PageHero } from '../../../components/ui/PageHero';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/ui/Pagination';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Badge } from '../../../components/ui/Badge';
import { FilterDropdown } from '../../../components/ui/FilterDropdown';

type TabKey = 'todos' | 'activo' | 'atrasado' | 'devuelto';

export const Prestamos = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const prestamos = usePrestamosStore(s => s.prestamos);
  const addPrestamo = usePrestamosStore(s => s.addPrestamo);
  const updatePrestamo = usePrestamosStore(s => s.updatePrestamo);
  const removePrestamo = usePrestamosStore(s => s.removePrestamo);
  const catalogoEquipos = useCatalogoEquiposStore(s => s.items);
  const fetchCatalogoEquipos = useCatalogoEquiposStore(s => s.fetchItems);
  const fetchPrestamos = usePrestamosStore(s => s.fetchPrestamos);

  // Solicitudes de equipo pendientes (para convertir en préstamo).
  const solicitudes = useSolicitudesEquipoAdminStore(s => s.solicitudes);
  const fetchSolicitudesEq = useSolicitudesEquipoAdminStore(s => s.fetchSolicitudes);
  const aprobarSolicitud = useSolicitudesEquipoAdminStore(s => s.aprobar);
  const rechazarSolicitud = useSolicitudesEquipoAdminStore(s => s.rechazar);
  const solicitudesPendientes = useMemo(() => solicitudes.filter(s => s.estado === 'Pendiente'), [solicitudes]);

  useEffect(() => {
    fetchCatalogoEquipos();
    fetchPrestamos();
    fetchSolicitudesEq();
  }, []);

  const handleAprobarSolicitud = async (sol: typeof solicitudes[number]) => {
    try {
      await aprobarSolicitud(sol);
      await fetchPrestamos();
      import('sweetalert2').then(S => S.default.fire({ icon: 'success', title: 'Préstamo creado', text: `Solicitud ${sol.numero} aprobada.`, timer: 1800, showConfirmButton: false }));
    } catch (err: any) {
      import('sweetalert2').then(S => S.default.fire('Error', 'No se pudo aprobar: ' + (err?.message || ''), 'error'));
    }
  };

  const mappedPrestamos = useMemo(() => prestamos.map(p => ({
    ...p,
    estudiante: p.estudiante_nombre,
    equipoId: p.equipo_id,
    equipoNombre: p.equipo_nombre,
    fechaPrestamo: p.fecha_prestamo,
    fechaDevolucionEsperada: p.fecha_devolucion_esperada,
    fechaDevolucionReal: p.fecha_devolucion_real,
  }) as Prestamo), [prestamos]);

  const today = hoy();
  const [activeTab, setActiveTab] = useState<TabKey>('todos');
  const [search, setSearch] = useState('');
  const [fechaFilter, setFechaFilter] = useState('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 8;
  const [modalType, setModalType] = useState<null | 'create' | 'delete' | 'bulkDelete'>(null);
  const [selected, setSelected] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(p => p.id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const defaultForm = { estudiante: '', equipoId: '', cantidad: 1, fechaDevolucionEsperada: '' };
  const [form, setForm] = useState(defaultForm);

  const kpis = useMemo(() => ({
    total: mappedPrestamos.length,
    activos: mappedPrestamos.filter(p => p.estado === 'activo' && !esAtrasado(p, today)).length,
    atrasados: mappedPrestamos.filter(p => esAtrasado(p, today)).length,
    devueltos: mappedPrestamos.filter(p => p.estado === 'devuelto').length,
  }), [mappedPrestamos, today]);

  const filtered = useMemo(() => {
    let result = [...mappedPrestamos];
    if (activeTab === 'activo') result = result.filter(p => p.estado === 'activo' && !esAtrasado(p, today));
    else if (activeTab === 'atrasado') result = result.filter(p => esAtrasado(p, today));
    else if (activeTab === 'devuelto') result = result.filter(p => p.estado === 'devuelto');
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => p.estudiante.toLowerCase().includes(q) || p.equipoNombre.toLowerCase().includes(q));
    }
    if (fechaFilter !== 'todos') {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      result = result.filter(p => {
        const fecha = p.fechaPrestamo;
        if (fechaFilter === 'hoy') return fecha === today;
        if (fechaFilter === 'semana') {
          const d = new Date(now); d.setDate(d.getDate() - d.getDay());
          return fecha >= d.toISOString().slice(0, 10);
        }
        if (fechaFilter === 'mes') return fecha.slice(0, 7) === today.slice(0, 7);
        if (fechaFilter === 'anio') return fecha.slice(0, 4) === today.slice(0, 4);
        return true;
      });
    }
    return result;
  }, [prestamos, activeTab, search, today, fechaFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (currentPage - 1) * perPage;
  const pageData = filtered.slice(start, start + perPage);

  const tabItems = [
    { key: 'todos' as TabKey, label: 'Todos', count: mappedPrestamos.length, icon: Package },
    { key: 'activo' as TabKey, label: 'Activos', count: kpis.activos, icon: Clock },
    { key: 'atrasado' as TabKey, label: 'Atrasados', count: kpis.atrasados, icon: AlertTriangle },
    { key: 'devuelto' as TabKey, label: 'Devueltos', count: kpis.devueltos, icon: CheckCircle },
  ];

  const estadoBadge = (p: Prestamo) => {
    if (p.estado === 'devuelto') return <Badge color="green" icon={CheckCircle}>Devuelto</Badge>;
    if (esAtrasado(p, today)) return <Badge color="red" icon={AlertTriangle} pulse>Atrasado</Badge>;
    return <Badge color="blue" icon={Clock}>Activo</Badge>;
  };

  const handleDevolver = async (id: string) => await updatePrestamo(id, { estado: 'devuelto', fecha_devolucion_real: hoy() });

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    const eq = catalogoEquipos.find(c => c.id === form.equipoId);
    if (!eq || !form.fechaDevolucionEsperada) return;
    try {
      await addPrestamo({
        id: 'PRST' + Date.now(),
        estudiante_nombre: form.estudiante,
        equipo_id: eq.id,
        equipo_nombre: eq.nombre,
        cantidad: Number(form.cantidad) || 1,
        fecha_prestamo: hoy(),
        fecha_devolucion_esperada: form.fechaDevolucionEsperada,
        fecha_devolucion_real: null,
        estado: 'activo',
      });
      setForm(defaultForm);
      setModalType(null);
    } catch (err: any) {
      import('sweetalert2').then(Swal => {
        Swal.default.fire('Error', 'No se pudo crear el préstamo: ' + (err.message || 'Error desconocido'), 'error');
      });
    }
  };

  const handleDelete = async () => {
    if (selected) { await removePrestamo(selected.id); setModalType(null); setSelected(null); }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await removePrestamo(id);
    }
    setSelectedIds([]);
    setModalType(null);
  };

  const handleExportSelected = () => {
    // Aquí puedes llamar a una función de exportación como en Solicitudes
    console.log('Exporting...', selectedIds);
    alert(`Se exportarán ${selectedIds.length} préstamos (funcionalidad en desarrollo)`);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      {!embedded && (
        <PageHero
          icon={ArrowLeftRight}
          title="Préstamos"
          subtitle="Entregas, devoluciones y atrasos de equipos."
          stats={[
            { Icon: Package, value: kpis.total, label: 'Total' },
            { Icon: Clock, value: kpis.activos, label: 'Activos' },
            { Icon: AlertTriangle, value: kpis.atrasados, label: 'Atrasados' },
            { Icon: CheckCircle, value: kpis.devueltos, label: 'Devueltos' },
          ]}
        />
      )}

      <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0 animate-fade-in flex flex-col">

        {/* SOLICITUDES DE EQUIPO PENDIENTES → aprobar genera el préstamo */}
        {solicitudesPendientes.length > 0 && (
          <div className="mb-6 bg-amber-50/80 border border-amber-200 rounded-[20px] p-5 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-amber-600" />
              <h3 className="text-[13px] font-extrabold text-amber-800 uppercase tracking-wide">Solicitudes de equipo pendientes ({solicitudesPendientes.length})</h3>
            </div>
            <div className="flex flex-col gap-2">
              {solicitudesPendientes.map(sol => (
                <div key={sol.id} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-amber-100 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-gray-800 truncate">{sol.numero} · {sol.estudiante}</p>
                    <p className="text-[10.5px] text-gray-500 truncate">{sol.items.map(i => `${i.nombre}${i.cantidad > 1 ? ` x${i.cantidad}` : ''}`).join(', ') || 'Sin ítems'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => rechazarSolicitud(sol.id)} className="text-[11px] font-bold text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors">Rechazar</button>
                    <button onClick={() => handleAprobarSolicitud(sol)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-sm transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative overflow-hidden flex-1 min-h-0">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-espoch-yellow via-orange-400 to-espoch-red opacity-90"></div>

          {/* TOOLBAR */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0 pt-2">
            <div className="flex items-center gap-3 flex-wrap flex-1 w-full xl:w-auto">
              <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1); }} placeholder="Buscar estudiante, equipo..." className="w-[200px] sm:w-[240px] shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <FilterDropdown
                  icon={Package}
                  label="Estado"
                  value={activeTab}
                  options={tabItems.map(t => ({ key: t.key, label: `${t.label} (${t.count})` }))}
                  onChange={(k) => { setActiveTab(k as TabKey); setCurrentPage(1); }}
                />
                <FilterDropdown
                  icon={Calendar}
                  label="Fecha"
                  value={fechaFilter}
                  options={[
                    { key: 'todos', label: 'Todos' },
                    { key: 'hoy', label: 'Hoy' },
                    { key: 'semana', label: 'Esta semana' },
                    { key: 'mes', label: 'Este mes' },
                    { key: 'anio', label: 'Este año' },
                  ]}
                  onChange={(k) => { setFechaFilter(k); setCurrentPage(1); }}
                />
                <button 
                  onClick={() => { setSearch(''); setActiveTab('todos'); setFechaFilter('todos'); setCurrentPage(1); }}
                  className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium hover:text-gray-700 transition-colors ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar filtros
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {selectedIds.length > 0 ? (
                <>
                  <button onClick={handleExportSelected} className="flex items-center gap-2 px-5 py-2 rounded-full border border-gray-200 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Exportar ({selectedIds.length})
                  </button>
                  <button onClick={() => setModalType('bulkDelete')} className="flex items-center gap-2 px-5 py-2 rounded-full border border-red-200 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar ({selectedIds.length})
                  </button>
                </>
              ) : (
                <button onClick={() => { setForm(defaultForm); setModalType('create'); }} className="bg-espoch-ink hover:bg-black text-white font-bold text-xs px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg transition-all border border-gray-800 shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Nuevo Préstamo
                </button>
              )}
            </div>
          </div>

          {/* TABLA */}
          <div className="w-full overflow-auto flex-1 flex flex-col min-h-0 relative custom-scrollbar border border-gray-100 rounded-xl">
            <div className="min-w-[920px] grid grid-cols-[40px_1.2fr_1.4fr_0.6fr_0.9fr_0.9fr_0.9fr_120px] gap-4 px-4 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10 pt-3">
              <div className="flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" 
                />
              </div>
              <div>Estudiante</div>
              <div>Equipo</div>
              <div className="text-center">Cant.</div>
              <div>Préstamo</div>
              <div>Devolución</div>
              <div>Estado</div>
              <div className="text-right">Acciones</div>
            </div>

            <div className="flex flex-col min-w-[920px]">
              {pageData.map((p, i) => (
                <div key={p.id} onClick={(e) => {
                  if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return;
                  toggleSelect(p.id);
                }} className={`grid grid-cols-[40px_1.2fr_1.4fr_0.6fr_0.9fr_0.9fr_0.9fr_120px] gap-4 px-4 py-3 border-b border-gray-50 transition-colors items-center animate-fade-in cursor-pointer ${selectedIds.includes(p.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`} style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="w-3.5 h-3.5 rounded border-gray-300 accent-espoch-yellow cursor-pointer" 
                    />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-gray-400" /></div>
                    <span className="text-xs font-bold text-gray-900 truncate">{p.estudiante}</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11.5px] font-semibold text-gray-700 truncate">{p.equipoNombre}</span>
                    <span className="text-[9px] text-gray-400 font-mono">{p.equipoId}</span>
                  </div>
                  <div className="text-center text-xs font-bold text-gray-700">{p.cantidad}</div>
                  <div className="text-[10.5px] font-semibold text-gray-600">{p.fechaPrestamo}</div>
                  <div className="flex flex-col">
                    <span className={`text-[10.5px] font-semibold ${esAtrasado(p, today) ? 'text-red-500' : 'text-gray-600'}`}>{p.fechaDevolucionEsperada}</span>
                    {p.fechaDevolucionReal && <span className="text-[9px] text-green-500">✓ {p.fechaDevolucionReal}</span>}
                  </div>
                  <div>{estadoBadge(p)}</div>
                  <div className="flex justify-end gap-1.5">
                    {p.estado === 'activo' && (
                      <button onClick={() => handleDevolver(p.id)} className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-[10px] font-bold" title="Marcar devuelto">
                        <RotateCcw className="w-3 h-3" /> Devolver
                      </button>
                    )}
                    <button onClick={() => { setSelected(p); setModalType('delete'); }} className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
              {pageData.length === 0 && (
                <EmptyState
                  icon={ArrowLeftRight}
                  title={prestamos.length === 0 ? 'Sin préstamos registrados' : 'Sin préstamos en esta vista'}
                  description={prestamos.length === 0 ? 'Registra la primera entrega de equipo a un estudiante.' : undefined}
                  actionLabel={prestamos.length === 0 ? 'Nuevo Préstamo' : undefined}
                  onAction={prestamos.length === 0 ? () => { setForm(defaultForm); setModalType('create'); } : undefined}
                  secondaryLabel={prestamos.length > 0 ? 'Limpiar filtros' : undefined}
                  onSecondary={prestamos.length > 0 ? () => { setSearch(''); setActiveTab('todos'); setFechaFilter('todos'); setCurrentPage(1); } : undefined}
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
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Nuevo Préstamo</h3>
            <p className="text-xs text-gray-500 mb-6">Registre la entrega de un equipo a un estudiante.</p>

            <form onSubmit={handleCrear} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estudiante</label>
                <input required value={form.estudiante} onChange={e => setForm({ ...form, estudiante: e.target.value })} placeholder="Nombre del estudiante" className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Equipo</label>
                <select required value={form.equipoId} onChange={e => setForm({ ...form, equipoId: e.target.value })} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium appearance-none cursor-pointer">
                  <option value="">Seleccione un equipo...</option>
                  {catalogoEquipos.filter(e => e.estado === 'disponible').map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.serie})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cantidad</label>
                  <input required type="number" min={1} value={form.cantidad} onChange={e => setForm({ ...form, cantidad: Number(e.target.value) })} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Devolución esperada</label>
                  <input required type="date" value={form.fechaDevolucionEsperada} onChange={e => setForm({ ...form, fechaDevolucionEsperada: e.target.value })} className="bg-gray-50 text-sm text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/50 font-medium" />
                </div>
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button type="button" onClick={() => setModalType(null)} className="px-5 py-2.5 rounded-full text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button type="submit" className="bg-espoch-ink hover:bg-black text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-lg transition-all border border-gray-800">Registrar Préstamo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={modalType === 'delete'}
        title="Eliminar Préstamo"
        message={<>¿Eliminar el préstamo de <b>{selected?.equipoNombre}</b> a <b>{selected?.estudiante}</b>?</>}
        onConfirm={handleDelete}
        onCancel={() => setModalType(null)}
      />

      <ConfirmDialog
        open={modalType === 'bulkDelete'}
        title="Eliminar Préstamos Múltiples"
        message={`¿Está seguro que desea eliminar los ${selectedIds.length} préstamos seleccionados?`}
        onConfirm={handleBulkDelete}
        onCancel={() => setModalType(null)}
      />
    </div>
  );
};
