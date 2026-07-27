import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package, MonitorSpeaker, UserCog, Wrench,
  CheckCircle, AlertTriangle, XOctagon, Clock, Loader, User,
} from 'lucide-react';
import { PageHero, type HeroStat } from '../../../components/ui/PageHero';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useMantenimientoStore } from '../../../store/mantenimientoStore';
import { useAsignacionesStore, resKey } from '../../../store/asignacionesStore';
import { useUsuariosStore } from '../../../store/usuariosStore';
import { Inventario } from './Inventario';
import { Asignaciones } from './Asignaciones';
import { Mantenimiento } from './Mantenimiento';

type ActivosTab = 'inventario' | 'asignaciones' | 'mantenimiento';

const TABS: { key: ActivosTab; label: string; Icon: React.ElementType; subtitle: string }[] = [
  { key: 'inventario', label: 'Inventario', Icon: MonitorSpeaker, subtitle: 'Equipos, herramientas, mobiliario y tecnología.' },
  { key: 'asignaciones', label: 'Asignaciones', Icon: UserCog, subtitle: 'Asigna recursos, espacios y edificios a técnicos responsables.' },
  { key: 'mantenimiento', label: 'Mantenimiento', Icon: Wrench, subtitle: 'Órdenes de trabajo y reparación de recursos.' },
];

// Centro único de activos físicos: el admin ve un recurso y desde el mismo módulo
// lo asigna a un técnico o le abre orden de mantenimiento, sin cambiar de pantalla.
export const Activos = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: ActivosTab = raw === 'asignaciones' || raw === 'mantenimiento' ? raw : 'inventario';
  const active = TABS.find(t => t.key === tab)!;

  // KPIs del hero según pestaña (los mismos que mostraban los heroes originales).
  const invItems = useInventarioStore(s => s.items);
  const fetchItems = useInventarioStore(s => s.fetchItems);
  const ordenes = useMantenimientoStore(s => s.ordenes);
  const fetchOrdenes = useMantenimientoStore(s => s.fetchOrdenes);
  const asignaciones = useAsignacionesStore(s => s.asignaciones);
  const fetchAsignaciones = useAsignacionesStore(s => s.fetchAsignaciones);
  const usuarios = useUsuariosStore(s => s.items);
  const fetchUsuarios = useUsuariosStore(s => s.fetchUsuarios);

  useEffect(() => { fetchItems(); fetchOrdenes(); fetchAsignaciones(); fetchUsuarios(); }, []);

  const heroStats = useMemo<HeroStat[]>(() => {
    if (tab === 'inventario') {
      return [
        { Icon: Package, value: invItems.length, label: 'Total' },
        { Icon: CheckCircle, value: invItems.filter(d => d.estado === 'bueno').length, label: 'Buen Estado' },
        { Icon: AlertTriangle, value: invItems.filter(d => d.estado === 'malo').length, label: 'Regular / Malo' },
        { Icon: XOctagon, value: invItems.filter(d => d.estado === 'dañado').length, label: 'Dañados' },
      ];
    }
    if (tab === 'mantenimiento') {
      return [
        { Icon: Wrench, value: ordenes.length, label: 'Total' },
        { Icon: Clock, value: ordenes.filter(o => o.estado === 'pendiente').length, label: 'Pendientes' },
        { Icon: Loader, value: ordenes.filter(o => o.estado === 'en_proceso').length, label: 'En proceso' },
        { Icon: CheckCircle, value: ordenes.filter(o => o.estado === 'resuelto').length, label: 'Resueltas' },
      ];
    }
    const tecnicos = usuarios.filter(u => {
      const rol = ((u as any).roles?.nombre || '').toLowerCase();
      return (u as any).id_rol === 3 || rol.includes('tecnic') || rol.includes('técnic');
    });
    const isDanado = (estado?: string | null) => estado === 'malo' || estado === 'dañado';
    return [
      { Icon: User, value: tecnicos.length, label: 'Técnicos' },
      { Icon: CheckCircle, value: Object.keys(asignaciones).length, label: 'Asignados' },
      { Icon: Package, value: invItems.filter(i => !asignaciones[resKey('item', i.id)]).length, label: 'Disponibles' },
      { Icon: AlertTriangle, value: invItems.filter(i => isDanado(i.estado)).length, label: 'Mantenim.' },
    ];
  }, [tab, invItems, ordenes, asignaciones, usuarios]);

  const setTab = (t: ActivosTab) => {
    if (t === 'inventario') setParams({}, { replace: true });
    else setParams({ tab: t }, { replace: true });
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      <PageHero icon={Package} title="Activos" subtitle={active.subtitle} stats={heroStats}>
        {/* Conmutador integrado al hero (patrón de Horarios): sin fila extra vacía */}
        <div className="flex items-center bg-espoch-herocard/80 rounded-xl p-1 border border-white/5 shadow-inner">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-[12px] font-bold transition-all ${
                tab === t.key ? 'bg-[#df0000] text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <t.Icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>
      </PageHero>

      <div className="flex-1 min-h-0 flex flex-col">
        {tab === 'inventario' && <Inventario embedded />}
        {tab === 'asignaciones' && <Asignaciones embedded />}
        {tab === 'mantenimiento' && <Mantenimiento embedded />}
      </div>
    </div>
  );
};

export default Activos;
