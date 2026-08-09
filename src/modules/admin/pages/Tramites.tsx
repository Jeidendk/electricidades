import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Inbox, FileText, ArrowLeftRight, Layers, Clock, CheckCircle, XCircle, Package, AlertTriangle,
} from 'lucide-react';
import { PageHero, type HeroStat } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { useSolicitudesAdminStore } from '../../../store/solicitudesAdminStore';
import { usePrestamosStore } from '../../../store/prestamosStore';
import { hoy } from '../../../lib/utils';
import { Solicitudes } from './Solicitudes';
import { Prestamos } from './Prestamos';

type TramitesTab = 'solicitudes' | 'prestamos';

const TABS: { key: TramitesTab; label: string; Icon: React.ElementType; subtitle: string }[] = [
  { key: 'solicitudes', label: 'Solicitudes', Icon: FileText, subtitle: 'Bandeja de oficios y reportes enviados por los estudiantes.' },
  { key: 'prestamos', label: 'Préstamos', Icon: ArrowLeftRight, subtitle: 'Entregas, devoluciones y atrasos de equipos.' },
];

// Bandeja única de trámites: la solicitud aprobada se convierte en préstamo
// dentro del mismo módulo, sin saltar entre pantallas.
export const Tramites = () => {
  const [params, setParams] = useSearchParams();
  const tab: TramitesTab = params.get('tab') === 'prestamos' ? 'prestamos' : 'solicitudes';
  const active = TABS.find(t => t.key === tab)!;

  // KPIs del hero según pestaña (mismos cálculos que los heroes originales).
  const solicitudes = useSolicitudesAdminStore(s => s.solicitudes);
  const fetchSolicitudes = useSolicitudesAdminStore(s => s.fetchSolicitudes);
  const prestamos = usePrestamosStore(s => s.prestamos);
  const fetchPrestamos = usePrestamosStore(s => s.fetchPrestamos);

  useEffect(() => { fetchSolicitudes(); fetchPrestamos(); }, []);

  const heroStats = useMemo<HeroStat[]>(() => {
    if (tab === 'solicitudes') {
      return [
        { Icon: Layers, value: solicitudes.length, label: 'Total' },
        { Icon: Clock, value: solicitudes.filter((s: any) => s.estado === 'pendiente').length, label: 'Pendientes' },
        { Icon: CheckCircle, value: solicitudes.filter((s: any) => s.estado === 'aprobado').length, label: 'Aprobados' },
        { Icon: XCircle, value: solicitudes.filter((s: any) => s.estado === 'rechazado').length, label: 'Rechazados' },
      ];
    }
    const today = hoy();
    const atrasado = (p: any) => p.estado === 'activo' && (p.fecha_devolucion_esperada || '') < today;
    return [
      { Icon: Package, value: prestamos.length, label: 'Total' },
      { Icon: Clock, value: prestamos.filter((p: any) => p.estado === 'activo' && !atrasado(p)).length, label: 'Activos' },
      { Icon: AlertTriangle, value: prestamos.filter((p: any) => atrasado(p)).length, label: 'Atrasados' },
      { Icon: CheckCircle, value: prestamos.filter((p: any) => p.estado === 'devuelto').length, label: 'Devueltos' },
    ];
  }, [tab, solicitudes, prestamos]);

  const setTab = (t: TramitesTab) => {
    if (t === 'solicitudes') setParams({}, { replace: true });
    else setParams({ tab: t }, { replace: true });
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      <PageHero icon={Inbox} title="Trámites" subtitle={active.subtitle} stats={heroStats} backgroundImage={HERO_BG.tramites}>
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
        {tab === 'solicitudes' && <Solicitudes embedded />}
        {tab === 'prestamos' && <Prestamos embedded />}
      </div>
    </div>
  );
};

export default Tramites;
