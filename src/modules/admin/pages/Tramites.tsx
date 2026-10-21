import { useEffect, useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Inbox, Layers, Clock, CheckCircle, XCircle } from 'lucide-react';
import { PageHero, type HeroStat } from '../../../components/ui/PageHero';
import { HERO_BG } from '../../../components/ui/heroBackgrounds';
import { useTramitesStore } from '../../../store/tramitesStore';
import { Solicitudes } from './Solicitudes';

/**
 * Bandeja de oficios y reportes (`solicitudes_admin`).
 *
 * Los préstamos de equipos vivían aquí como una segunda pestaña, pero son otro recorrido y otra
 * tabla (`solicitudes_equipo` + `prestamos`): tienen su propia pantalla en `/admin/prestamos`.
 * Mezclarlos escondía el contador de solicitudes pendientes detrás de una pestaña.
 */
export const Tramites = () => {
  const [params] = useSearchParams();
  const tramites = useTramitesStore(estado => estado.tramites);
  const fetchSolicitudes = useTramitesStore(estado => estado.fetchTramites);

  useEffect(() => { void fetchSolicitudes(); }, []);

  // Los borradores del estudiante no se han presentado: contarlos aquí inflaría la bandeja con
  // trámites que nadie tiene que revisar.
  const presentados = useMemo(() => tramites.filter(t => t.estado !== 'borrador'), [tramites]);

  const heroStats = useMemo<HeroStat[]>(() => [
    { Icon: Layers, value: presentados.length, label: 'Total' },
    { Icon: Clock, value: presentados.filter(t => t.estado === 'pendiente').length, label: 'Por revisar' },
    { Icon: CheckCircle, value: presentados.filter(t => t.estado === 'aprobado').length, label: 'Aprobados' },
    { Icon: XCircle, value: presentados.filter(t => t.estado === 'rechazado').length, label: 'Rechazados' },
  ], [presentados]);

  // Los enlaces guardados a la pestaña de préstamos siguen funcionando.
  if (params.get('tab') === 'prestamos') return <Navigate to="/admin/prestamos" replace />;

  return (
    <div className="flex flex-col h-full bg-[#f4f7fb]">
      <PageHero
        icon={Inbox}
        title="Trámites"
        subtitle="Bandeja de oficios y reportes enviados por los estudiantes."
        stats={heroStats}
        backgroundImage={HERO_BG.tramites}
      />

      <div className="flex-1 min-h-0 flex flex-col">
        <Solicitudes embedded />
      </div>
    </div>
  );
};

export default Tramites;
