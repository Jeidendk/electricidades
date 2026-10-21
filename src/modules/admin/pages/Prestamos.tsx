import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeftRight, Plus, X, Clock, CheckCircle, AlertTriangle, Trash2, User, Package,
  Calendar, RotateCcw, FileText, Inbox, Truck, Undo2, MapPin, Ban,
} from 'lucide-react';
import { usePrestamosStore, type PrestamoConOrigen } from '../../../store/prestamosStore';
import { useSolicitudesEquipoAdminStore, type SolEquipoAdmin } from '../../../store/solicitudesEquipoAdminStore';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import {
  DIAS_PRESTAMO_POR_DEFECTO, ETIQUETA_ESTADO_SOLICITUD, esAtrasado, ocupaUnidad,
  puedeAprobarse, puedeCancelarlaElPersonal, puedeEntregarse, puedeRechazarse, resumirPrestamos,
  sumarDias, type CondicionDevolucion,
} from '../data/flujoPrestamos';
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
import { avisoError, avisoExito, confirmarAccion, pedirTexto } from '../../../lib/aviso';
import { friendlyDbError } from '../../../lib/notifyError';

/**
 * Préstamos de equipos, de punta a punta.
 *
 * Tres secciones porque son tres momentos distintos del mismo recorrido, y mezclarlos en una
 * tabla obligaba a filtrar para entender qué hay que hacer hoy:
 *   Solicitudes  · lo que espera una decisión (y lo ya decidido, para consultarlo)
 *   Activos      · lo reservado y lo entregado, con los atrasos a la vista
 *   Devoluciones · el historial de lo que volvió
 *
 * Ninguna acción escribe en las tablas: todas llaman a las funciones de la migración 0043, que
 * comprueban permisos y disponibilidad en el servidor.
 */

type Seccion = 'solicitudes' | 'activos' | 'devoluciones';

const SECCIONES: { key: Seccion; label: string; Icon: React.ElementType }[] = [
  { key: 'solicitudes', label: 'Solicitudes', Icon: Inbox },
  { key: 'activos', label: 'Préstamos activos', Icon: Clock },
  { key: 'devoluciones', label: 'Devoluciones', Icon: Undo2 },
];

const FILTROS_SOLICITUD = [
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'aprobadas', label: 'Aprobadas y entregadas' },
  { key: 'cerradas', label: 'Rechazadas y canceladas' },
  { key: 'todas', label: 'Todas' },
];

const CONDICIONES: { key: CondicionDevolucion; label: string }[] = [
  { key: 'bueno', label: 'En buen estado — vuelve a estar disponible' },
  { key: 'malo', label: 'Con fallas — queda fuera de servicio' },
  { key: 'dañado', label: 'Dañado — queda fuera de servicio' },
];

const POR_PAGINA = 8;

const fechaCorta = (valor?: string | null) => (valor ? valor.split('-').reverse().join('/') : '—');

export const Prestamos = () => {
  const solicitudes = useSolicitudesEquipoAdminStore(s => s.solicitudes);
  const errorSolicitudes = useSolicitudesEquipoAdminStore(s => s.error);
  const procesando = useSolicitudesEquipoAdminStore(s => s.procesando);
  const fetchSolicitudes = useSolicitudesEquipoAdminStore(s => s.fetchSolicitudes);
  const aprobarSolicitud = useSolicitudesEquipoAdminStore(s => s.aprobar);
  const entregarSolicitud = useSolicitudesEquipoAdminStore(s => s.entregar);
  const rechazarSolicitud = useSolicitudesEquipoAdminStore(s => s.rechazar);
  const cancelarSolicitud = useSolicitudesEquipoAdminStore(s => s.cancelar);

  const prestamos = usePrestamosStore(s => s.prestamos);
  const errorPrestamos = usePrestamosStore(s => s.error);
  const fetchPrestamos = usePrestamosStore(s => s.fetchPrestamos);
  const addPrestamo = usePrestamosStore(s => s.addPrestamo);
  const removePrestamo = usePrestamosStore(s => s.removePrestamo);
  const devolverPrestamo = usePrestamosStore(s => s.devolver);

  const inventario = useInventarioStore(s => s.items);
  const fetchInventario = useInventarioStore(s => s.fetchItems);
  const espacios = useEspaciosStore(s => s.items);
  const fetchEspacios = useEspaciosStore(s => s.fetchEspacios);

  useEffect(() => {
    fetchSolicitudes();
    fetchPrestamos();
    fetchInventario();
    fetchEspacios();
  }, []);

  const today = hoy();
  const [seccion, setSeccion] = useState<Seccion>('solicitudes');
  const [search, setSearch] = useState('');
  const [filtroSolicitud, setFiltroSolicitud] = useState('pendientes');
  const [filtroFecha, setFiltroFecha] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const [detalle, setDetalle] = useState<SolEquipoAdmin | null>(null);
  const [modal, setModal] = useState<null | 'nuevo' | 'borrar'>(null);
  const [prestamoABorrar, setPrestamoABorrar] = useState<PrestamoConOrigen | null>(null);

  const nombreEspacio = useMemo(() => {
    const porId = new Map(espacios.map(e => [e.id, e.nombre]));
    return (id?: string | null) => (id ? porId.get(id) ?? 'Ubicación desconocida' : 'Sin ubicación');
  }, [espacios]);

  const pendientes = useMemo(
    () => solicitudes.filter(s => s.estado === 'Pendiente'),
    [solicitudes],
  );
  const resumen = useMemo(() => resumirPrestamos(prestamos, today), [prestamos, today]);

  // --- Filtrado por sección -------------------------------------------------

  const solicitudesVisibles = useMemo(() => {
    const porEstado = solicitudes.filter(s => {
      if (filtroSolicitud === 'pendientes') return s.estado === 'Pendiente';
      if (filtroSolicitud === 'aprobadas') return s.estado === 'Aprobada' || s.estado === 'Entregada';
      if (filtroSolicitud === 'cerradas') return ['Rechazada', 'Cancelada', 'Devuelto'].includes(s.estado);
      return true;
    });
    const q = search.trim().toLowerCase();
    if (!q) return porEstado;
    return porEstado.filter(s =>
      s.numero.toLowerCase().includes(q)
      || s.estudiante.toLowerCase().includes(q)
      || (s.asignatura || '').toLowerCase().includes(q)
      || s.items.some(i => i.nombre.toLowerCase().includes(q)));
  }, [solicitudes, filtroSolicitud, search]);

  const prestamosDeSeccion = useMemo(() => {
    const base = prestamos.filter(p => (seccion === 'activos' ? ocupaUnidad(p.estado) : !ocupaUnidad(p.estado)));
    const q = search.trim().toLowerCase();
    const buscados = !q ? base : base.filter(p =>
      p.estudiante_nombre.toLowerCase().includes(q)
      || p.equipo_nombre.toLowerCase().includes(q)
      || (p.serieUnidad || '').toLowerCase().includes(q)
      || (p.numeroSolicitud || '').toLowerCase().includes(q));

    if (filtroFecha === 'todos') return buscados;
    return buscados.filter(p => {
      const fecha = p.fecha_entrega || p.fecha_prestamo;
      if (filtroFecha === 'atrasados') return esAtrasado(p, today);
      if (filtroFecha === 'hoy') return fecha === today;
      if (filtroFecha === 'mes') return fecha.slice(0, 7) === today.slice(0, 7);
      if (filtroFecha === 'anio') return fecha.slice(0, 4) === today.slice(0, 4);
      return true;
    });
  }, [prestamos, seccion, search, filtroFecha, today]);

  const filas: (SolEquipoAdmin | PrestamoConOrigen)[] =
    seccion === 'solicitudes' ? solicitudesVisibles : prestamosDeSeccion;
  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  const cambiarSeccion = (nueva: Seccion) => {
    setSeccion(nueva);
    setPagina(1);
    setSearch('');
    setFiltroFecha('todos');
  };

  // --- Acciones -------------------------------------------------------------
  // Cada una confirma, llama al servidor y deja que el error del servidor se vea tal cual:
  // "no hay unidades suficientes de X" es exactamente lo que quien aprueba necesita leer.

  const ejecutar = async (accion: () => Promise<boolean | void>, exito: string) => {
    try {
      // `false` = la operación ni se envió (ya había otra en curso): anunciar éxito mentiría.
      const enviado = await accion();
      if (enviado !== false) void avisoExito(exito);
    } catch (err: any) {
      const amigable = friendlyDbError(err);
      void avisoError(amigable.title, err?.message || amigable.text);
    }
  };

  const onAprobar = async (sol: SolEquipoAdmin) => {
    const confirmado = await confirmarAccion({
      title: `¿Aprobar la solicitud ${sol.numero}?`,
      text: `Se reservarán las unidades para ${sol.estudiante}. La entrega se registra después, cuando el equipo salga del laboratorio.`,
      confirmar: 'Sí, aprobar y reservar',
    });
    if (!confirmado) return;
    await ejecutar(() => aprobarSolicitud(sol.id, DIAS_PRESTAMO_POR_DEFECTO), 'Unidades reservadas');
  };

  const onEntregar = async (sol: SolEquipoAdmin) => {
    const confirmado = await confirmarAccion({
      title: `¿Registrar la entrega de ${sol.numero}?`,
      text: `El plazo de ${DIAS_PRESTAMO_POR_DEFECTO} días empieza hoy: la devolución se esperará el ${fechaCorta(sumarDias(today, DIAS_PRESTAMO_POR_DEFECTO))}.`,
      confirmar: 'Sí, entregar',
    });
    if (!confirmado) return;
    await ejecutar(() => entregarSolicitud(sol.id, DIAS_PRESTAMO_POR_DEFECTO), 'Entrega registrada');
  };

  const onRechazar = async (sol: SolEquipoAdmin) => {
    const motivo = await pedirTexto({
      title: `Rechazar ${sol.numero}`,
      text: 'El estudiante verá este motivo en Mis Solicitudes.',
      placeholder: 'Ej: los equipos están reservados para prácticas esa semana.',
      confirmar: 'Rechazar solicitud',
      obligatorio: true,
    });
    if (motivo === null) return;
    await ejecutar(() => rechazarSolicitud(sol.id, motivo), 'Solicitud rechazada');
  };

  const onCancelar = async (sol: SolEquipoAdmin) => {
    const motivo = await pedirTexto({
      title: `Cancelar ${sol.numero}`,
      text: sol.estado === 'Aprobada'
        ? 'Las unidades reservadas volverán a estar disponibles.'
        : 'La solicitud quedará cerrada sin procesar.',
      confirmar: 'Cancelar solicitud',
    });
    if (motivo === null) return;
    await ejecutar(() => cancelarSolicitud(sol.id, motivo), 'Solicitud cancelada');
  };

  const onDevolver = async (prestamo: PrestamoConOrigen) => {
    const Swal = (await import('sweetalert2')).default;
    const { isConfirmed, value } = await Swal.fire({
      title: `Devolución de ${prestamo.equipo_nombre}`,
      html: `<p style="font-size:13px;color:#64748b;margin-bottom:8px">${prestamo.serieUnidad ? `Unidad ${prestamo.serieUnidad} · ` : ''}${prestamo.estudiante_nombre}</p>`,
      input: 'select',
      inputOptions: Object.fromEntries(CONDICIONES.map(c => [c.key, c.label])),
      inputValue: 'bueno',
      showCancelButton: true,
      confirmButtonText: 'Registrar devolución',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B00020',
      cancelButtonColor: '#64748b',
      reverseButtons: true,
    });
    if (!isConfirmed) return;

    const condicion = (value || 'bueno') as CondicionDevolucion;
    let observaciones: string | null = null;
    if (condicion !== 'bueno') {
      observaciones = await pedirTexto({
        title: 'Describe el daño',
        text: 'Queda en la ficha del equipo, que dejará de ofrecerse hasta que se repare.',
        confirmar: 'Registrar',
        obligatorio: true,
      });
      if (observaciones === null) return;
    }
    await ejecutar(
      () => devolverPrestamo(prestamo.id, condicion, observaciones ?? undefined),
      'Devolución registrada',
    );
  };

  // --- Alta manual (préstamo de mostrador, sin solicitud previa) -------------

  const unidadesOcupadas = useMemo(
    () => new Set(prestamos.filter(p => ocupaUnidad(p.estado) && p.id_inventario).map(p => p.id_inventario as string)),
    [prestamos],
  );
  const unidadesLibres = useMemo(
    () => inventario.filter(u => u.estado === 'bueno' && !unidadesOcupadas.has(u.id)),
    [inventario, unidadesOcupadas],
  );

  const formularioVacio = { estudiante: '', idUnidad: '', dias: String(DIAS_PRESTAMO_POR_DEFECTO) };
  const [form, setForm] = useState(formularioVacio);

  const onCrearManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const unidad = inventario.find(u => u.id === form.idUnidad);
    if (!unidad || !form.estudiante.trim()) return;
    const dias = Number(form.dias) || DIAS_PRESTAMO_POR_DEFECTO;

    await ejecutar(async () => {
      await addPrestamo({
        id: `PRST-M${Date.now()}`,
        estudiante_nombre: form.estudiante.trim(),
        equipo_id: unidad.id,
        equipo_nombre: unidad.nombre,
        id_inventario: unidad.id,
        cantidad: 1,
        fecha_prestamo: today,
        fecha_entrega: today,
        fecha_devolucion_esperada: sumarDias(today, dias),
        estado: 'activo',
        observaciones: 'Préstamo de mostrador, sin solicitud previa.',
      });
      setForm(formularioVacio);
      setModal(null);
    }, 'Préstamo registrado');
  };

  const onBorrar = async () => {
    if (!prestamoABorrar) return;
    await ejecutar(() => removePrestamo(prestamoABorrar.id), 'Registro eliminado');
    setPrestamoABorrar(null);
    setModal(null);
  };

  // --- Presentación ---------------------------------------------------------

  const insigniaSolicitud = (estado: string) => {
    if (estado === 'Pendiente') return <Badge color="amber" icon={Clock} pulse>Pendiente</Badge>;
    if (estado === 'Aprobada') return <Badge color="blue" icon={CheckCircle}>Aprobada</Badge>;
    if (estado === 'Entregada') return <Badge color="purple" icon={Truck}>Entregada</Badge>;
    if (estado === 'Devuelto') return <Badge color="green" icon={Undo2}>Devuelta</Badge>;
    if (estado === 'Cancelada') return <Badge color="slate" icon={Ban}>Cancelada</Badge>;
    return <Badge color="red" icon={X}>Rechazada</Badge>;
  };

  const insigniaPrestamo = (prestamo: PrestamoConOrigen) => {
    if (prestamo.estado === 'reservado') return <Badge color="amber" icon={Package}>Reservado</Badge>;
    if (prestamo.estado === 'cancelado') return <Badge color="slate" icon={Ban}>Cancelado</Badge>;
    if (prestamo.estado === 'devuelto') return <Badge color="green" icon={CheckCircle}>Devuelto</Badge>;
    if (esAtrasado(prestamo, today)) return <Badge color="red" icon={AlertTriangle} pulse>Atrasado</Badge>;
    return <Badge color="blue" icon={Clock}>Entregado</Badge>;
  };

  const error = errorSolicitudes || errorPrestamos;

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      <PageHero
        icon={ArrowLeftRight}
        title="Préstamos"
        subtitle="Solicitudes de equipos, entregas y devoluciones."
        backgroundImage={HERO_BG.prestamos}
        stats={[
          { Icon: Inbox, value: pendientes.length, label: 'Por revisar' },
          { Icon: Package, value: resumen.reservados, label: 'Reservados' },
          { Icon: Clock, value: resumen.activos, label: 'Entregados' },
          { Icon: AlertTriangle, value: resumen.atrasados, label: 'Atrasados' },
        ]}
      >
        <div className="flex items-center bg-espoch-herocard/80 rounded-xl p-1 border border-white/5 shadow-inner">
          {SECCIONES.map(s => (
            <button
              key={s.key}
              onClick={() => cambiarSeccion(s.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${
                seccion === s.key ? 'bg-[#df0000] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <s.Icon className="w-4 h-4" /> {s.label}
              {s.key === 'solicitudes' && pendientes.length > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-espoch-yellow text-espoch-ink text-[10px] font-extrabold flex items-center justify-center">
                  {pendientes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </PageHero>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0 animate-fade-in flex flex-col">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[12px] font-extrabold text-red-800">No se pudo leer la información completa</p>
              <p className="text-[11px] text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-xl rounded-[20px] shadow-sm border border-gray-200/60 p-6 flex flex-col relative overflow-hidden flex-1 min-h-0">
          <AcentoTarjeta />

          {/* TOOLBAR */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 shrink-0 pt-2">
            <div className="flex items-center gap-3 flex-wrap flex-1 w-full xl:w-auto">
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setPagina(1); }}
                placeholder={seccion === 'solicitudes' ? 'Buscar número, estudiante, equipo…' : 'Buscar estudiante, equipo, serie…'}
                className="w-[220px] sm:w-[260px] shrink-0"
              />
              {seccion === 'solicitudes' ? (
                <FilterDropdown
                  icon={Inbox}
                  label="Estado"
                  value={filtroSolicitud}
                  options={FILTROS_SOLICITUD}
                  onChange={(k) => { setFiltroSolicitud(k); setPagina(1); }}
                />
              ) : (
                <FilterDropdown
                  icon={Calendar}
                  label={seccion === 'activos' ? 'Situación' : 'Fecha'}
                  value={filtroFecha}
                  options={[
                    { key: 'todos', label: 'Todos' },
                    ...(seccion === 'activos' ? [{ key: 'atrasados', label: 'Solo atrasados' }] : []),
                    { key: 'hoy', label: 'Hoy' },
                    { key: 'mes', label: 'Este mes' },
                    { key: 'anio', label: 'Este año' },
                  ]}
                  onChange={(k) => { setFiltroFecha(k); setPagina(1); }}
                />
              )}
              <button
                onClick={() => { setSearch(''); setFiltroFecha('todos'); setFiltroSolicitud('pendientes'); setPagina(1); }}
                className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium hover:text-gray-700 transition-colors ml-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpiar filtros
              </button>
            </div>

            {seccion === 'activos' && (
              <button
                onClick={() => { setForm(formularioVacio); setModal('nuevo'); }}
                className="bg-espoch-ink hover:bg-black text-white font-bold text-xs px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg transition-all border border-gray-800 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Préstamo de mostrador
              </button>
            )}
          </div>

          {/* TABLA */}
          <div className="w-full overflow-auto flex-1 flex flex-col min-h-0 relative custom-scrollbar border border-gray-100 rounded-xl">
            {seccion === 'solicitudes' ? (
              <>
                <div className="min-w-[940px] grid grid-cols-[1fr_1.2fr_1.1fr_1.4fr_0.9fr_0.9fr_200px] gap-4 px-4 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10 pt-3">
                  <div>Número</div>
                  <div>Estudiante</div>
                  <div>Asignatura</div>
                  <div>Equipos</div>
                  <div>Fecha</div>
                  <div>Estado</div>
                  <div className="text-right">Acciones</div>
                </div>
                {(visibles as SolEquipoAdmin[]).map(sol => (
                  <div key={sol.id} className="min-w-[940px] grid grid-cols-[1fr_1.2fr_1.1fr_1.4fr_0.9fr_0.9fr_200px] gap-4 px-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors">
                    <button onClick={() => setDetalle(sol)} className="text-left text-[12px] font-extrabold text-espoch-red hover:underline truncate">
                      {sol.numero}
                    </button>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-gray-800 truncate">{sol.estudiante}</p>
                      <p className="text-[10px] text-gray-400 truncate">{sol.carrera || 'Sin carrera registrada'}</p>
                    </div>
                    <div className="text-[11.5px] text-gray-600 truncate">{sol.asignatura || '—'}</div>
                    <div className="text-[11.5px] text-gray-600 truncate">
                      {sol.items.map(i => `${i.nombre}${i.cantidad > 1 ? ` ×${i.cantidad}` : ''}`).join(', ') || 'Sin ítems'}
                    </div>
                    <div className="text-[11px] text-gray-500">{fechaCorta(sol.fecha)}</div>
                    <div>{insigniaSolicitud(sol.estado)}</div>
                    <div className="flex items-center justify-end gap-1.5">
                      {puedeAprobarse(sol.estado) && (
                        <button
                          onClick={() => onAprobar(sol)}
                          disabled={procesando !== null}
                          className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 transition-colors text-[10px] font-bold"
                          title="Aprobar y reservar unidades"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Aprobar
                        </button>
                      )}
                      {puedeRechazarse(sol.estado) && (
                        <button
                          onClick={() => onRechazar(sol)}
                          disabled={procesando !== null}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-40 transition-colors"
                          title="Rechazar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {puedeEntregarse(sol.estado) && (
                        <button
                          onClick={() => onEntregar(sol)}
                          disabled={procesando !== null}
                          className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 transition-colors text-[10px] font-bold"
                          title="Registrar la entrega física"
                        >
                          <Truck className="w-3.5 h-3.5" /> Entregar
                        </button>
                      )}
                      {puedeCancelarlaElPersonal(sol.estado) && (
                        <button
                          onClick={() => onCancelar(sol)}
                          disabled={procesando !== null}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
                          title="Cancelar y liberar unidades"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setDetalle(sol)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                        title="Ver detalle"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="min-w-[980px] grid grid-cols-[1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_0.9fr_130px] gap-4 px-4 pb-3 border-b border-gray-100 text-[9px] font-extrabold text-gray-500 uppercase tracking-widest sticky top-0 bg-white z-10 pt-3">
                  <div>Estudiante</div>
                  <div>Unidad</div>
                  <div>Solicitud</div>
                  <div>{seccion === 'activos' ? 'Entrega' : 'Entregado'}</div>
                  <div>{seccion === 'activos' ? 'Devolver antes de' : 'Devuelto'}</div>
                  <div>{seccion === 'activos' ? 'Estado' : 'Condición'}</div>
                  <div className="text-right">Acciones</div>
                </div>
                {(visibles as PrestamoConOrigen[]).map(p => (
                  <div key={p.id} className="min-w-[980px] grid grid-cols-[1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_0.9fr_130px] gap-4 px-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <p className="text-[12px] font-bold text-gray-800 truncate">{p.estudiante_nombre}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] text-gray-700 truncate">{p.equipo_nombre}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {p.serieUnidad ? `Serie ${p.serieUnidad}` : 'Unidad sin identificar (registro anterior)'}
                      </p>
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">{p.numeroSolicitud || 'Mostrador'}</div>
                    <div className="text-[11px] text-gray-500">{fechaCorta(p.fecha_entrega || p.fecha_prestamo)}</div>
                    <div className="text-[11px] text-gray-500">
                      {seccion === 'activos' ? fechaCorta(p.fecha_devolucion_esperada) : fechaCorta(p.fecha_devolucion_real)}
                    </div>
                    <div>
                      {seccion === 'activos'
                        ? insigniaPrestamo(p)
                        : <span className="text-[11px] text-gray-600">{p.condicion_devolucion || (p.estado === 'cancelado' ? 'Reserva liberada' : '—')}</span>}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      {p.estado === 'activo' && (
                        <button
                          onClick={() => onDevolver(p)}
                          className="flex items-center gap-1 px-2.5 h-7 rounded-md bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-[10px] font-bold"
                          title="Registrar devolución"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> Devolver
                        </button>
                      )}
                      {p.estado === 'reservado' && (
                        <span className="text-[10px] text-gray-400 font-semibold">Esperando entrega</span>
                      )}
                      {!ocupaUnidad(p.estado) && (
                        <button
                          onClick={() => { setPrestamoABorrar(p); setModal('borrar'); }}
                          className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                          title="Eliminar del historial"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {filas.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-12">
                <EmptyState
                  icon={seccion === 'solicitudes' ? Inbox : Package}
                  title={
                    seccion === 'solicitudes' ? 'Sin solicitudes en esta vista'
                      : seccion === 'activos' ? 'Ningún equipo fuera del laboratorio'
                        : 'Todavía no hay devoluciones'
                  }
                  description={
                    error
                      ? 'La consulta falló: lo que ves puede estar incompleto.'
                      : 'Cambia los filtros o espera a que llegue una solicitud nueva.'
                  }
                  secondaryLabel="Limpiar filtros"
                  onSecondary={() => { setSearch(''); setFiltroFecha('todos'); setFiltroSolicitud('todas'); }}
                />
              </div>
            )}
          </div>

          <Pagination
            page={paginaSegura}
            totalPages={totalPaginas}
            onChange={setPagina}
            total={filas.length}
            perPage={POR_PAGINA}
            className="pt-4 shrink-0"
          />
        </div>
      </div>

      {/* DETALLE DE LA SOLICITUD */}
      {detalle && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[640px] max-h-[85vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Solicitud de equipos</p>
                <h3 className="text-[18px] font-extrabold text-gray-900">{detalle.numero}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">{fechaCorta(detalle.fecha)} · {detalle.hora}</p>
              </div>
              <div className="flex items-center gap-3">
                {insigniaSolicitud(detalle.estado)}
                <button onClick={() => setDetalle(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Dato etiqueta="Estudiante" valor={detalle.estudiante} />
                <Dato etiqueta="Carrera" valor={detalle.carrera || 'Sin registrar'} />
                <Dato etiqueta="Asignatura" valor={detalle.asignatura || 'Sin registrar'} />
                <Dato etiqueta="Estado" valor={ETIQUETA_ESTADO_SOLICITUD[detalle.estado] ?? detalle.estado} />
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Equipos solicitados</p>
                <div className="flex flex-col gap-2">
                  {detalle.items.map((item, i) => (
                    <div key={`${item.nombre}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-gray-800 truncate">{item.nombre}</p>
                        <p className="text-[10.5px] text-gray-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" /> {nombreEspacio(item.id_espacio)}
                        </p>
                      </div>
                      <span className="text-[12px] font-extrabold text-gray-700 shrink-0">×{item.cantidad}</span>
                    </div>
                  ))}
                  {detalle.items.length === 0 && <p className="text-[12px] text-gray-400">Sin ítems registrados.</p>}
                </div>
              </div>

              {detalle.observacion && (
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Observaciones del estudiante</p>
                  <p className="text-[12px] text-gray-700 whitespace-pre-line">{detalle.observacion}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Historial</p>
                <p className="text-[12px] text-gray-700">
                  {detalle.decididoPor
                    ? `${ETIQUETA_ESTADO_SOLICITUD[detalle.estado] ?? detalle.estado} por ${detalle.decididoPor}${detalle.decididoEn ? ` el ${fechaCorta(detalle.decididoEn.slice(0, 10))}` : ''}.`
                    : 'Todavía no la ha procesado nadie.'}
                </p>
                {detalle.motivoRechazo && (
                  <p className="text-[12px] text-red-700 mt-1">Motivo: {detalle.motivoRechazo}</p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Unidades asignadas</p>
                {prestamos.filter(p => p.numeroSolicitud === detalle.numero).length === 0 ? (
                  <p className="text-[12px] text-gray-400">Ninguna todavía: se asignan al aprobar.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {prestamos.filter(p => p.numeroSolicitud === detalle.numero).map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-3 text-[11.5px] text-gray-700">
                        <span className="truncate">{p.equipo_nombre}{p.serieUnidad ? ` · ${p.serieUnidad}` : ''}</span>
                        {insigniaPrestamo(p)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRÉSTAMO DE MOSTRADOR */}
      {modal === 'nuevo' && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-[4px] p-4 animate-fade-in">
          <form onSubmit={onCrearManual} className="bg-white rounded-2xl p-7 shadow-[0_25px_60px_rgba(0,0,0,0.3)] w-full max-w-[460px] animate-scale-in flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[16px] font-extrabold text-gray-900">Préstamo de mostrador</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Para lo que se entrega sin solicitud previa. Queda registrado igual.</p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Estudiante</span>
              <input
                value={form.estudiante}
                onChange={e => setForm({ ...form, estudiante: e.target.value })}
                required
                placeholder="Nombres y apellidos"
                className="bg-white text-[13px] text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/60"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                Unidad disponible ({unidadesLibres.length})
              </span>
              <select
                value={form.idUnidad}
                onChange={e => setForm({ ...form, idUnidad: e.target.value })}
                required
                className="bg-white text-[13px] text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/60"
              >
                <option value="">Elige la unidad que sale…</option>
                {unidadesLibres.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} · {u.serie}</option>
                ))}
              </select>
              <span className="text-[10.5px] text-gray-400">
                Solo unidades en buen estado que no estén reservadas ni prestadas.
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">Días de préstamo</span>
              <input
                type="number"
                min={1}
                max={180}
                value={form.dias}
                onChange={e => setForm({ ...form, dias: e.target.value })}
                className="bg-white text-[13px] text-gray-800 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-espoch-yellow/60"
              />
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="px-5 py-2.5 rounded-full text-[12px] font-bold text-gray-500 hover:bg-gray-100">
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2.5 rounded-full bg-espoch-red hover:bg-espoch-darkred text-white text-[12px] font-bold shadow-sm">
                Registrar préstamo
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={modal === 'borrar'}
        title="Eliminar del historial"
        message={`Se borrará el registro de ${prestamoABorrar?.equipo_nombre || 'este préstamo'}. El historial es la prueba de lo que pasó con el equipo.`}
        confirmLabel="Eliminar"
        onConfirm={onBorrar}
        onCancel={() => { setModal(null); setPrestamoABorrar(null); }}
      />
    </div>
  );
};

const Dato = ({ etiqueta, valor }: { etiqueta: string; valor: string }) => (
  <div>
    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">{etiqueta}</p>
    <p className="text-[12.5px] font-semibold text-gray-800">{valor}</p>
  </div>
);

export default Prestamos;
