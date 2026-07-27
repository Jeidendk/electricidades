import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Package, Wrench, Clock, CheckCircle, AlertTriangle,
  UserCog, ArrowRight, Building2, DoorOpen, Microscope, Settings, Sofa, MonitorPlay
} from 'lucide-react';
import { PageHero } from '../../../components/ui/PageHero';
import { useAuthStore } from '../../../store/authStore';
import { useAsignacionesStore, resKey } from '../../../store/asignacionesStore';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useMantenimientoStore } from '../../../store/mantenimientoStore';
import { useEdificiosStore } from '../../../store/edificiosStore';

const CAT_ICON: Record<string, React.ElementType> = {
  equipos: Settings, herramientas: Wrench, mobiliario: Sofa, tecnologico: MonitorPlay,
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

  // Recursos asignados a este técnico (normalizados)
  const misRecursos = useMemo(() => {
    const out: { nombre: string; sub: string; Icon: React.ElementType }[] = [];
    invItems.forEach(i => { if (asignaciones[resKey('item', i.id)] === tecnicoId) out.push({ nombre: i.nombre, sub: `Espacio: ${i.id_espacio || 'N/A'}`, Icon: CAT_ICON[i.categoria] ?? Package }); });
    espacios.forEach(e => { if (asignaciones[resKey('espacio', e.id)] === tecnicoId) out.push({ nombre: e.nombre, sub: `Edificio: ${e.id_edificio} · Piso ${e.piso}`, Icon: e.tipo === 'Académica' ? DoorOpen : Microscope }); });
    edificios.forEach(e => { if (asignaciones[resKey('edificio', e.id)] === tecnicoId) out.push({ nombre: e.nombre, sub: 'Edificio', Icon: Building2 }); });
    return out;
  }, [asignaciones, invItems, espacios, tecnicoId]);

  // Órdenes de mantenimiento asignadas a este técnico
  const misOrdenes = useMemo(() => ordenes.filter(o => o.id_tecnico === tecnicoId), [ordenes, tecnicoId]);

  const kpis = useMemo(() => ({
    asignados: misRecursos.length,
    pendientes: misOrdenes.filter(o => o.estado === 'pendiente').length,
    enProceso: misOrdenes.filter(o => o.estado === 'en_proceso').length,
    resueltas: misOrdenes.filter(o => o.estado === 'resuelto').length,
  }), [misRecursos, misOrdenes]);

  const estadoBadge = (estado: string) => {
    if (estado === 'pendiente') return <span className="bg-yellow-50 text-yellow-600 border border-yellow-200/50 text-[9px] font-bold px-2 py-0.5 rounded-full">Pendiente</span>;
    if (estado === 'en_proceso') return <span className="bg-blue-50 text-blue-600 border border-blue-200/50 text-[9px] font-bold px-2 py-0.5 rounded-full">En proceso</span>;
    return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/50 text-[9px] font-bold px-2 py-0.5 rounded-full">Resuelto</span>;
  };

  const cards = [
    { label: 'Recursos asignados', value: kpis.asignados, Icon: Package, color: 'text-gray-700 bg-gray-100' },
    { label: 'OT pendientes', value: kpis.pendientes, Icon: Clock, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'OT en proceso', value: kpis.enProceso, Icon: Wrench, color: 'text-blue-600 bg-blue-50' },
    { label: 'OT resueltas', value: kpis.resueltas, Icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      <PageHero
        icon={LayoutGrid}
        title={`Hola, ${tecnico.nombre.split(' ')[0]}`}
        subtitle="Resumen de tus recursos y órdenes de mantenimiento."
        stats={[
          { Icon: Package, value: kpis.asignados, label: 'Asignados' },
          { Icon: Clock, value: kpis.pendientes, label: 'Pendientes' },
          { Icon: Wrench, value: kpis.enProceso, label: 'En proceso' },
          { Icon: CheckCircle, value: kpis.resueltas, label: 'Resueltas' },
        ]}
      />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 flex flex-col gap-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
                <c.Icon className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-[22px] font-extrabold text-gray-900 leading-none">{c.value}</span>
                <span className="text-[11px] font-semibold text-gray-500 mt-1">{c.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Mis órdenes de mantenimiento */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-extrabold text-gray-900 flex items-center gap-2"><Wrench className="w-4 h-4 text-gray-400" /> Mis órdenes de mantenimiento</h3>
              <button onClick={() => navigate('/tecnico/mantenimiento')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
              {misOrdenes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <CheckCircle className="w-10 h-10 opacity-20 mb-2" />
                  <p className="text-[12px] font-bold text-gray-500">Sin órdenes asignadas</p>
                </div>
              ) : misOrdenes.map(o => (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${o.prioridad === 'alta' ? 'bg-red-50 text-red-500' : o.prioridad === 'media' ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-500'}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-900 truncate">{o.recurso_nombre}</p>
                    <p className="text-[10px] text-gray-400 truncate">{o.ubicacion}</p>
                  </div>
                  {estadoBadge(o.estado)}
                </div>
              ))}
            </div>
          </div>

          {/* Mis recursos asignados */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-extrabold text-gray-900 flex items-center gap-2"><UserCog className="w-4 h-4 text-gray-400" /> Mis recursos asignados</h3>
              <button onClick={() => navigate('/tecnico/asignaciones')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                Gestionar <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
              {misRecursos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Package className="w-10 h-10 opacity-20 mb-2" />
                  <p className="text-[12px] font-bold text-gray-500">Sin recursos asignados</p>
                </div>
              ) : misRecursos.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <r.Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-900 truncate">{r.nombre}</p>
                    <p className="text-[10px] text-gray-400 truncate">{r.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TecnicoDashboard;
