import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Package, Wrench, Clock, CheckCircle, AlertTriangle, AlertCircle,
  ArrowRight, Building2, DoorOpen, Microscope, Settings, Sofa, MonitorPlay,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip as RechartsTooltip, PieChart, Pie, Cell,
} from 'recharts';
import { PageHero } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { useAuthStore } from '../../../store/authStore';
import { useAsignacionesStore, resKey } from '../../../store/asignacionesStore';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useMantenimientoStore } from '../../../store/mantenimientoStore';
import { useEdificiosStore } from '../../../store/edificiosStore';
import {
  alertasDelTecnico, contarOrdenes, distribucionPorEstado, diasDesde,
  ESTADO_ORDEN, MAX_ALERTAS_VISIBLES, type EquipoAsignado, type OrdenTecnico,
} from './tecnicoDashboardMetrics';

const CAT_ICON: Record<string, React.ElementType> = {
  equipos: Settings,
  herramientas: Wrench,
  mobiliario: Sofa,
  tecnologico: MonitorPlay,
};

const inicioDelDia = (fecha: Date) => {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
};

const claveFecha = (fecha: Date) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const estadoBadge = (estado: string) => {
  if (estado === ESTADO_ORDEN.pendiente) return <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">Pendiente</span>;
  if (estado === ESTADO_ORDEN.enProceso) return <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">En proceso</span>;
  return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Resuelto</span>;
};

export const TecnicoDashboard = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);
  const tecnicoId = authUser?.tecnicoId || authUser?.id || '';
  const nombreTecnico = authUser?.nombre?.split(' ')[0] || 'Técnico';

  const { items: edificios, fetchEdificios } = useEdificiosStore();
  const { items: espacios, fetchEspacios } = useEspaciosStore();
  const { items: invItems, fetchItems } = useInventarioStore();
  const { ordenes, fetchOrdenes } = useMantenimientoStore();
  const { asignaciones, fetchAsignaciones } = useAsignacionesStore();

  useEffect(() => {
    fetchEdificios();
    fetchEspacios();
    fetchItems();
    fetchOrdenes();
    fetchAsignaciones();
  }, []);

  const misEquipos = useMemo<EquipoAsignado[]>(
    () => invItems
      .filter(item => asignaciones[resKey('item', item.id)] === tecnicoId)
      .map(item => ({ id: item.id, nombre: item.nombre, estado: item.estado, danio_desc: item.danio_desc })),
    [asignaciones, invItems, tecnicoId],
  );

  const misRecursos = useMemo(() => {
    const recursos: { id: string; nombre: string; detalle: string; categoria: string; Icono: React.ElementType }[] = [];
    invItems.forEach(item => {
      if (asignaciones[resKey('item', item.id)] === tecnicoId) recursos.push({
        id: `item-${item.id}`,
        nombre: item.nombre,
        detalle: `Espacio: ${item.id_espacio || 'Sin asignar'}`,
        categoria: item.categoria,
        Icono: CAT_ICON[item.categoria] ?? Package,
      });
    });
    espacios.forEach(espacio => {
      if (asignaciones[resKey('espacio', espacio.id)] === tecnicoId) recursos.push({
        id: `espacio-${espacio.id}`,
        nombre: espacio.nombre,
        detalle: `Piso ${espacio.piso} · ${espacio.tipo}`,
        categoria: 'Espacios',
        Icono: espacio.tipo === 'Académica' ? DoorOpen : Microscope,
      });
    });
    edificios.forEach(edificio => {
      if (asignaciones[resKey('edificio', edificio.id)] === tecnicoId) recursos.push({
        id: `edificio-${edificio.id}`,
        nombre: edificio.nombre,
        detalle: 'Edificio asignado',
        categoria: 'Edificios',
        Icono: Building2,
      });
    });
    return recursos;
  }, [asignaciones, invItems, espacios, edificios, tecnicoId]);

  const misOrdenes = useMemo<OrdenTecnico[]>(
    () => (ordenes as any[]).filter(orden => orden.id_tecnico === tecnicoId),
    [ordenes, tecnicoId],
  );
  const conteo = useMemo(() => contarOrdenes(misOrdenes), [misOrdenes]);
  const distribucion = useMemo(() => distribucionPorEstado(misOrdenes), [misOrdenes]);
  const alertas = useMemo(() => alertasDelTecnico(misOrdenes, misEquipos), [misOrdenes, misEquipos]);

  const actividadSemanal = useMemo(() => {
    const hoy = inicioDelDia(new Date());
    return Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - (6 - indice));
      const clave = claveFecha(fecha);
      const reportadas = misOrdenes.filter(orden => claveFecha(new Date(orden.fecha_reporte)) === clave).length;
      const resueltas = misOrdenes.filter(orden => orden.fecha_cierre && claveFecha(new Date(orden.fecha_cierre)) === clave).length;
      return {
        fecha: fecha.toLocaleDateString('es-EC', { weekday: 'short' }).replace('.', ''),
        reportadas,
        resueltas,
      };
    });
  }, [misOrdenes]);

  const ordenesRecientes = useMemo(() => [...misOrdenes].sort((a, b) => {
    const aCerrada = a.estado === ESTADO_ORDEN.resuelto ? 1 : 0;
    const bCerrada = b.estado === ESTADO_ORDEN.resuelto ? 1 : 0;
    if (aCerrada !== bCerrada) return aCerrada - bCerrada;
    return new Date(b.fecha_reporte).getTime() - new Date(a.fecha_reporte).getTime();
  }).slice(0, 7), [misOrdenes]);

  const kpis = [
    { titulo: 'Recursos asignados', valor: misRecursos.length, detalle: `${misEquipos.length} equipos de inventario`, Icono: Package, fondo: 'from-[#b00000] to-[#d33131]', sombra: 'shadow-red-900/15' },
    { titulo: 'Órdenes pendientes', valor: conteo.pendientes, detalle: 'Requieren revisión', Icono: Clock, fondo: 'from-amber-500 to-orange-500', sombra: 'shadow-orange-900/15' },
    { titulo: 'En proceso', valor: conteo.enProceso, detalle: 'Trabajo activo', Icono: Wrench, fondo: 'from-blue-600 to-cyan-500', sombra: 'shadow-blue-900/15' },
    { titulo: 'Órdenes resueltas', valor: conteo.resueltas, detalle: 'Mantenimientos cerrados', Icono: CheckCircle, fondo: 'from-emerald-600 to-teal-500', sombra: 'shadow-emerald-900/15' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f4f7fb]">
      <PageHero
        icon={LayoutGrid}
        title={`Hola, ${nombreTecnico}`}
        subtitle="Resumen de tus recursos y órdenes de mantenimiento."
        backgroundImage={HERO_BG.tecnico}
      />

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-5 lg:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.65fr)]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-espoch-red">Actividad de mantenimiento</p>
                <h2 className="mt-1 text-[18px] font-extrabold text-slate-900">Comportamiento de los últimos 7 días</h2>
                <p className="mt-1 text-[10px] font-medium text-slate-500">Órdenes reportadas y resueltas dentro de tu asignación.</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-2 text-right">
                <p className="text-[9px] font-semibold text-slate-400">Órdenes totales</p>
                <p className="text-[22px] font-black leading-none text-slate-900">{misOrdenes.length}</p>
              </div>
            </div>
            <div className="mt-4 h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={actividadSemanal} margin={{ top: 12, right: 12, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tecnicoReportadas" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b00000" stopOpacity={0.28} /><stop offset="100%" stopColor="#b00000" stopOpacity={0} /></linearGradient>
                    <linearGradient id="tecnicoResueltas" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e8eef5" strokeDasharray="3 4" />
                  <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} />
                  <Area type="monotone" dataKey="reportadas" name="Reportadas" stroke="#b00000" strokeWidth={2.5} fill="url(#tecnicoReportadas)" dot={{ r: 3, fill: '#fff', stroke: '#b00000', strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="resueltas" name="Resueltas" stroke="#f59e0b" strokeWidth={2.5} fill="url(#tecnicoResueltas)" dot={{ r: 3, fill: '#fff', stroke: '#f59e0b', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Estado general</p>
              <h2 className="mt-1 text-[18px] font-extrabold text-slate-900">Distribución de órdenes</h2>
            </div>
            <div className="relative mx-auto mt-3 h-[180px] max-w-[230px]">
              {misOrdenes.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribucion} dataKey="value" nameKey="name" innerRadius={56} outerRadius={78} paddingAngle={3} stroke="none">{distribucion.map(porcion => <Cell key={porcion.name} fill={porcion.color} />)}</Pie></PieChart></ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] font-bold text-slate-400">TOTAL</span><span className="text-[28px] font-black text-slate-900">{misOrdenes.length}</span></div>
                </>
              ) : <div className="flex h-full items-center justify-center text-[11px] text-slate-400">Sin órdenes asignadas</div>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {distribucion.map(porcion => (
                <div key={porcion.name} className="text-center"><p className="text-[15px] font-black text-slate-900">{porcion.porcentaje}</p><p className="mt-0.5 truncate text-[8px] font-semibold text-slate-500">{porcion.name}</p><span className="mx-auto mt-1 block h-1 w-6 rounded-full" style={{ backgroundColor: porcion.color }} /></div>
              ))}
            </div>
          </section>
        </div>

        <section aria-label="Resumen de trabajo" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ titulo, valor, detalle, Icono, fondo, sombra }) => (
            <article key={titulo} className={`relative min-h-[112px] overflow-hidden rounded-2xl bg-gradient-to-br ${fondo} p-4 text-white shadow-lg ${sombra}`}>
              <div className="absolute -bottom-8 -right-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold text-white/80">{titulo}</p><p className="mt-2 text-[26px] font-black leading-none">{valor}</p><p className="mt-2 text-[9px] font-medium text-white/75">{detalle}</p></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Icono className="h-4 w-4" /></span></div>
            </article>
          ))}
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.65fr)]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-espoch-red">Seguimiento</p><h2 className="mt-1 text-[15px] font-extrabold text-slate-900">Alertas recientes</h2></div>
              {alertas.length > MAX_ALERTAS_VISIBLES && <span className="text-[9px] font-bold text-slate-400">{alertas.length} en total</span>}
            </div>
            <div className="mt-4 space-y-3">
              {alertas.length === 0 ? (
                <div className="flex min-h-[190px] flex-col items-center justify-center text-slate-400"><CheckCircle className="h-8 w-8 text-emerald-300" /><p className="mt-2 text-[10px] font-semibold">Sin alertas: todo en orden</p></div>
              ) : alertas.slice(0, MAX_ALERTAS_VISIBLES).map(alerta => (
                <div key={alerta.id} className="flex gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${alerta.severidad === 'critica' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>{alerta.severidad === 'critica' ? <AlertCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}</span>
                  <div className="min-w-0"><p className="truncate text-[10px] font-extrabold text-slate-800">{alerta.titulo}</p><p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-slate-500">{alerta.detalle}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-espoch-red">Orden de trabajo</p><h2 className="mt-1 text-[15px] font-extrabold text-slate-900">Mis órdenes de mantenimiento</h2></div>
              <button onClick={() => navigate('/tecnico/mantenimiento')} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-[9px] font-bold text-white transition-colors hover:bg-black">Ver todas <ArrowRight className="h-3 w-3" /></button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[680px] overflow-hidden rounded-xl border border-slate-100">
                <div className="grid grid-cols-[minmax(160px,1.4fr)_minmax(110px,0.9fr)_80px_85px_90px] gap-3 bg-slate-900 px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-white"><span>Recurso</span><span>Ubicación</span><span>Prioridad</span><span>Antigüedad</span><span className="text-right">Estado</span></div>
                {ordenesRecientes.length === 0 ? (
                  <p className="py-14 text-center text-[11px] text-slate-400">Todavía no tienes órdenes asignadas.</p>
                ) : ordenesRecientes.map(orden => (
                  <div key={orden.id} className="grid grid-cols-[minmax(160px,1.4fr)_minmax(110px,0.9fr)_80px_85px_90px] items-center gap-3 border-t border-slate-100 px-3 py-3 text-[9px]">
                    <span className="truncate font-extrabold text-slate-800">{orden.recurso_nombre}</span>
                    <span className="truncate text-slate-500">{orden.ubicacion || 'Sin ubicación'}</span>
                    <span className={`font-bold capitalize ${orden.prioridad === 'alta' ? 'text-red-600' : orden.prioridad === 'media' ? 'text-amber-600' : 'text-slate-500'}`}>{orden.prioridad}</span>
                    <span className="text-slate-500">Hace {diasDesde(orden.fecha_reporte)} d</span>
                    <span className="text-right">{estadoBadge(orden.estado)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex justify-end"><button onClick={() => navigate('/tecnico/asignaciones')} className="text-[9px] font-bold text-espoch-red hover:underline">Gestionar recursos asignados</button></div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TecnicoDashboard;
