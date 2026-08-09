import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Package, Wrench, Clock, CheckCircle, AlertTriangle, AlertCircle,
  UserCog, ArrowRight, Building2, DoorOpen, Microscope, Settings, Sofa, MonitorPlay, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
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
  alertasDelTecnico,
  contarOrdenes,
  distribucionPorEstado,
  diasDesde,
  estadoInventarioAsignado,
  ordenesPorPrioridad,
  recursosPorCategoria,
  ESTADO_ORDEN,
  MAX_ALERTAS_VISIBLES,
  type EquipoAsignado,
  type OrdenTecnico,
} from './tecnicoDashboardMetrics';

const CAT_ICON: Record<string, React.ElementType> = {
  equipos: Settings, herramientas: Wrench, mobiliario: Sofa, tecnologico: MonitorPlay,
};

const CATEGORIA_ESPACIO = 'Espacios';
const CATEGORIA_EDIFICIO = 'Edificios';

const TarjetaVacia = ({ Icono, mensaje }: { Icono: React.ElementType; mensaje: string }) => (
  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
    <Icono className="w-9 h-9 opacity-20 mb-2" />
    <p className="text-[11px] font-bold text-gray-500">{mensaje}</p>
  </div>
);

const TituloTarjeta = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <h3 className="text-xs font-bold text-gray-800">{children}</h3>
    <Info className="w-3.5 h-3.5 text-gray-400" />
  </div>
);

const TooltipGrafico = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white p-2 rounded shadow border border-gray-100">
      <p className="text-[10px] font-bold text-gray-800 mb-1">{label}</p>
      {payload.map((entrada: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-600 mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entrada.color || entrada.fill }} />
          <span>{entrada.name}:</span>
          <span className="font-bold text-gray-900">{entrada.value}</span>
        </div>
      ))}
    </div>
  );
};

export const TecnicoDashboard = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore(s => s.user);
  const tecnico = authUser?.role === 'tecnico' ? authUser : {
    id: 'TEC001', nombre: 'Técnico', rol: 'Técnico', avatar: null, role: 'tecnico' as any, tecnicoId: 'TEC001'
  };
  const tecnicoId = tecnico.tecnicoId || 'TEC001';

  const edificios = useEdificiosStore(s => s.items);
  const fetchEdificios = useEdificiosStore(s => s.fetchEdificios);

  useEffect(() => {
    fetchEdificios();
  }, []);

  const asignaciones = useAsignacionesStore(s => s.asignaciones);
  const invItems = useInventarioStore(s => s.items);
  const espacios = useEspaciosStore(s => s.items);
  const ordenes = useMantenimientoStore(s => s.ordenes);

  // Equipos de inventario a cargo del técnico: alimentan el estado del inventario y las alertas.
  const misEquipos = useMemo<EquipoAsignado[]>(
    () => invItems
      .filter(i => asignaciones[resKey('item', i.id)] === tecnicoId)
      .map(i => ({ id: i.id, nombre: i.nombre, estado: i.estado, danio_desc: i.danio_desc })),
    [asignaciones, invItems, tecnicoId],
  );

  // Todo lo que el técnico tiene a cargo: equipos, espacios y edificios.
  const misRecursos = useMemo(() => {
    const out: { nombre: string; sub: string; categoria: string; Icon: React.ElementType }[] = [];
    invItems.forEach(i => { if (asignaciones[resKey('item', i.id)] === tecnicoId) out.push({ nombre: i.nombre, sub: `Espacio: ${i.id_espacio || 'N/A'}`, categoria: i.categoria, Icon: CAT_ICON[i.categoria] ?? Package }); });
    espacios.forEach(e => { if (asignaciones[resKey('espacio', e.id)] === tecnicoId) out.push({ nombre: e.nombre, sub: `Edificio: ${e.id_edificio} · Piso ${e.piso}`, categoria: CATEGORIA_ESPACIO, Icon: e.tipo === 'Académica' ? DoorOpen : Microscope }); });
    edificios.forEach(e => { if (asignaciones[resKey('edificio', e.id)] === tecnicoId) out.push({ nombre: e.nombre, sub: 'Edificio', categoria: CATEGORIA_EDIFICIO, Icon: Building2 }); });
    return out;
  }, [asignaciones, invItems, espacios, edificios, tecnicoId]);

  const misOrdenes = useMemo<OrdenTecnico[]>(
    () => (ordenes as any[]).filter(o => o.id_tecnico === tecnicoId),
    [ordenes, tecnicoId],
  );

  const conteoOrdenes = useMemo(() => contarOrdenes(misOrdenes), [misOrdenes]);
  const repartoPorEstado = useMemo(() => distribucionPorEstado(misOrdenes), [misOrdenes]);
  const repartoPorPrioridad = useMemo(() => ordenesPorPrioridad(misOrdenes), [misOrdenes]);
  const categoriasDeRecursos = useMemo(() => recursosPorCategoria(misRecursos), [misRecursos]);
  const estadoDeEquipos = useMemo(() => estadoInventarioAsignado(misEquipos), [misEquipos]);
  const alertas = useMemo(() => alertasDelTecnico(misOrdenes, misEquipos), [misOrdenes, misEquipos]);

  // Las abiertas primero y, dentro de ellas, las reportadas hace más tiempo.
  const ordenesRecientes = useMemo(
    () => [...misOrdenes].sort((a, b) => {
      const abierta = (o: OrdenTecnico) => (o.estado === ESTADO_ORDEN.resuelto ? 1 : 0);
      if (abierta(a) !== abierta(b)) return abierta(a) - abierta(b);
      return new Date(a.fecha_reporte).getTime() - new Date(b.fecha_reporte).getTime();
    }),
    [misOrdenes],
  );

  const estadoBadge = (estado: string) => {
    if (estado === ESTADO_ORDEN.pendiente) return <span className="bg-yellow-50 text-yellow-600 border border-yellow-200/50 text-[9px] font-bold px-2 py-0.5 rounded-full">Pendiente</span>;
    if (estado === ESTADO_ORDEN.enProceso) return <span className="bg-blue-50 text-blue-600 border border-blue-200/50 text-[9px] font-bold px-2 py-0.5 rounded-full">En proceso</span>;
    return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/50 text-[9px] font-bold px-2 py-0.5 rounded-full">Resuelto</span>;
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb] overflow-hidden">
      <PageHero
        icon={LayoutGrid}
        title={`Hola, ${tecnico.nombre.split(' ')[0]}`}
        subtitle="Resumen de tus recursos y órdenes de mantenimiento."
        stats={[
          { Icon: Package, value: misRecursos.length, label: 'Asignados' },
          { Icon: Clock, value: conteoOrdenes.pendientes, label: 'Pendientes' },
          { Icon: Wrench, value: conteoOrdenes.enProceso, label: 'En proceso' },
          { Icon: CheckCircle, value: conteoOrdenes.resueltas, label: 'Resueltas' },
        ]}
        backgroundImage={HERO_BG.tecnico}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 lg:p-5 flex flex-col gap-3 lg:gap-4">

        {/* FILA 1: GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 shrink-0">

          {/* Carga de trabajo por prioridad */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col h-[200px]">
            <div className="flex items-center justify-between mb-2">
              <TituloTarjeta>Mis órdenes por prioridad</TituloTarjeta>
              <div className="hidden sm:flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[9px] font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> Pendientes</span>
                <span className="flex items-center gap-1.5 text-[9px] font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-[#2563EB]"></span> En proceso</span>
                <span className="flex items-center gap-1.5 text-[9px] font-medium text-gray-600"><span className="w-2 h-2 rounded-full bg-[#10B981]"></span> Resueltas</span>
              </div>
            </div>

            {misOrdenes.length === 0 ? (
              <TarjetaVacia Icono={Wrench} mensaje="Todavía no tienes órdenes asignadas" />
            ) : (
              <div className="w-full flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repartoPorPrioridad} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="prioridad" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RechartsTooltip content={<TooltipGrafico />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="pendientes" name="Pendientes" stackId="ordenes" fill="#F59E0B" radius={[0, 0, 0, 0]} barSize={28} />
                    <Bar dataKey="enProceso" name="En proceso" stackId="ordenes" fill="#2563EB" barSize={28} />
                    <Bar dataKey="resueltas" name="Resueltas" stackId="ordenes" fill="#10B981" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Estado de mis órdenes */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col h-[200px]">
            <div className="mb-2">
              <TituloTarjeta>Estado de mis órdenes</TituloTarjeta>
            </div>

            {misOrdenes.length === 0 ? (
              <TarjetaVacia Icono={CheckCircle} mensaje="Nada pendiente por ahora" />
            ) : (
              <div className="flex-1 flex items-center gap-3 min-h-0">
                <div className="relative w-[110px] h-[110px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={repartoPorEstado} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2} dataKey="value" stroke="none">
                        {repartoPorEstado.map((porcion, i) => <Cell key={i} fill={porcion.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[8px] font-bold text-gray-400 mb-0.5">Total</span>
                    <span className="text-sm font-bold text-gray-800 leading-none">{misOrdenes.length}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full">
                  {repartoPorEstado.map(porcion => (
                    <div key={porcion.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: porcion.color }}></div>
                        <span className="text-[9px] font-medium text-gray-700 truncate">{porcion.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] font-bold text-gray-900">{porcion.porcentaje}</span>
                        <span className="text-[8px] text-gray-400 w-5 text-right">({porcion.value})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FILA 2: RECURSOS, EQUIPOS Y ALERTAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">

          {/* Recursos por categoría */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4">
            <div className="mb-3"><TituloTarjeta>Recursos a mi cargo</TituloTarjeta></div>
            {categoriasDeRecursos.length === 0 ? (
              <TarjetaVacia Icono={Package} mensaje="Sin recursos asignados" />
            ) : (
              <div className="flex flex-col gap-2.5">
                {categoriasDeRecursos.map(categoria => (
                  <div key={categoria.name} className="flex items-center gap-2">
                    <span className="text-[9px] font-medium text-gray-600 w-20 truncate capitalize">{categoria.name}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-espoch-red rounded-full" style={{ width: `${(categoria.value / categoria.max) * 100}%` }}></div>
                    </div>
                    <span className="text-[9px] font-bold text-gray-900 w-5 text-right">{categoria.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estado de mis equipos */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4">
            <div className="mb-3"><TituloTarjeta>Estado de mis equipos</TituloTarjeta></div>
            {misEquipos.length === 0 ? (
              <TarjetaVacia Icono={Settings} mensaje="Sin equipos asignados" />
            ) : (
              <div className="flex flex-col gap-2.5">
                {estadoDeEquipos.map(estado => (
                  <div key={estado.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: estado.color }}></div>
                    <span className="text-[9px] font-medium text-gray-600 flex-1 truncate">{estado.name}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: estado.porcentaje, backgroundColor: estado.color }}></div>
                    </div>
                    <span className="text-[9px] font-bold text-gray-900 w-6 text-right">{estado.value}</span>
                    <span className="text-[8px] text-gray-400 w-8 text-right">({estado.porcentaje})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alertas */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <TituloTarjeta>Alertas</TituloTarjeta>
              {alertas.length > MAX_ALERTAS_VISIBLES && (
                <span className="text-[9px] font-bold text-gray-400">{alertas.length} en total</span>
              )}
            </div>

            {alertas.length === 0 ? (
              <TarjetaVacia Icono={CheckCircle} mensaje="Sin alertas: todo en orden" />
            ) : (
              <div className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar max-h-[180px]">
                {alertas.slice(0, MAX_ALERTAS_VISIBLES).map(alerta => (
                  <div key={alerta.id} className="flex gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${alerta.severidad === 'critica' ? 'bg-red-50' : 'bg-amber-50'}`}>
                      {alerta.severidad === 'critica'
                        ? <AlertCircle className="w-3 h-3 text-red-500" />
                        : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-gray-800 truncate">{alerta.titulo}</p>
                      <p className="text-[8px] text-gray-500 truncate">{alerta.detalle}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FILA 3: LISTADOS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

          {/* Mis órdenes de mantenimiento */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2"><Wrench className="w-4 h-4 text-gray-400" /> Mis órdenes de mantenimiento</h3>
              <button onClick={() => navigate('/tecnico/mantenimiento')} className="text-[9px] font-medium text-espoch-red hover:underline flex items-center gap-0.5">
                Ver todas <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>

            {ordenesRecientes.length === 0 ? (
              <TarjetaVacia Icono={CheckCircle} mensaje="Sin órdenes asignadas" />
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[260px]">
                {ordenesRecientes.map(orden => (
                  <div key={orden.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${orden.prioridad === 'alta' ? 'bg-red-50 text-red-500' : orden.prioridad === 'media' ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-500'}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-gray-900 truncate">{orden.recurso_nombre}</p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {orden.ubicacion || 'Sin ubicación'} · hace {diasDesde(orden.fecha_reporte)} d
                      </p>
                    </div>
                    {estadoBadge(orden.estado)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mis recursos asignados */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2"><UserCog className="w-4 h-4 text-gray-400" /> Mis recursos asignados</h3>
              <button onClick={() => navigate('/tecnico/asignaciones')} className="text-[9px] font-medium text-espoch-red hover:underline flex items-center gap-0.5">
                Gestionar <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>

            {misRecursos.length === 0 ? (
              <TarjetaVacia Icono={Package} mensaje="Sin recursos asignados" />
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar max-h-[260px]">
                {misRecursos.map((recurso, i) => (
                  <div key={`${recurso.nombre}-${i}`} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                      <recurso.Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-gray-900 truncate">{recurso.nombre}</p>
                      <p className="text-[10px] text-gray-400 truncate">{recurso.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TecnicoDashboard;
