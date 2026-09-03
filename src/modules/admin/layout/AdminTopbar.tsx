import {
  LayoutGrid,
  FileText, Package, Users,
  BookMarked, BarChart2, Building2, CalendarDays,
  BookOpen, Inbox, Menu
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useSidebarStore } from '../../../store/sidebarStore';
interface RouteConfig {
  icon: React.ElementType;
  iconBg: string;
  iconBorder: string;
  iconColor: string;
  section: string;
  title: string;
  subtitle: string;
}

const ROUTES: Record<string, RouteConfig> = {
  '/admin/dashboard': {
    icon: LayoutGrid, iconBg: 'bg-amber-50', iconBorder: 'border-amber-200', iconColor: 'text-amber-600',
    section: 'Inicio', title: 'Panel de Control',
    subtitle: 'Vista general del sistema de gestión de aulas y recursos.',
  },
  '/admin/tramites': {
    icon: Inbox, iconBg: 'bg-red-50', iconBorder: 'border-red-200', iconColor: 'text-red-600',
    section: 'Trámites', title: 'Trámites',
    subtitle: 'Solicitudes y préstamos de equipos en una sola bandeja.',
  },
  '/admin/formatos': {
    icon: FileText, iconBg: 'bg-blue-50', iconBorder: 'border-blue-200', iconColor: 'text-blue-600',
    section: 'Trámites', title: 'Formatos',
    subtitle: 'Plantillas y documentos descargables.',
  },
  '/admin/horarios': {
    icon: CalendarDays, iconBg: 'bg-emerald-50', iconBorder: 'border-emerald-200', iconColor: 'text-emerald-600',
    section: 'Académico', title: 'Horarios',
    subtitle: 'Planificación de clases y uso de espacios.',
  },
  '/admin/activos': {
    icon: Package, iconBg: 'bg-slate-50', iconBorder: 'border-slate-200', iconColor: 'text-slate-600',
    section: 'Recursos', title: 'Activos',
    subtitle: 'Inventario, asignaciones y mantenimiento de recursos físicos.',
  },
  '/admin/infraestructura': {
    icon: Building2, iconBg: 'bg-slate-50', iconBorder: 'border-slate-200', iconColor: 'text-slate-600',
    section: 'Infraestructura', title: 'Infraestructura',
    subtitle: 'Edificios, aulas y laboratorios del campus.',
  },
  '/admin/estructura-academica': {
    icon: Building2, iconBg: 'bg-indigo-50', iconBorder: 'border-indigo-200', iconColor: 'text-indigo-600',
    section: 'Institución', title: 'Estructura Académica',
    subtitle: 'Gestión de Facultades, Carreras y Malla Curricular.',
  },
  '/admin/recursos': {
    icon: BookOpen, iconBg: 'bg-green-50', iconBorder: 'border-green-200', iconColor: 'text-green-600',
    section: 'Académico', title: 'Recursos',
    subtitle: 'Recursos didácticos disponibles para estudiantes.',
  },
  '/admin/usuarios': {
    icon: Users, iconBg: 'bg-slate-50', iconBorder: 'border-slate-200', iconColor: 'text-slate-600',
    section: 'Administración', title: 'Usuarios',
    subtitle: 'Gestión de cuentas, roles y permisos.',
  },

  '/admin/reportes': {
    icon: BarChart2, iconBg: 'bg-blue-50', iconBorder: 'border-blue-200', iconColor: 'text-blue-600',
    section: 'Sistema', title: 'Reportes',
    subtitle: 'Estadísticas y métricas del sistema.',
  },
  '/admin/asignacion-mapa': {
    icon: BookMarked, iconBg: 'bg-violet-50', iconBorder: 'border-violet-200', iconColor: 'text-violet-600',
    section: 'Gestión', title: 'Mapa de Asignaciones',
    subtitle: 'Vista geográfica de asignaciones activas.',
  },
};

const TopbarTitle = ({ cfg }: { cfg: RouteConfig }) => {
  const { icon: Icon, iconBg, iconBorder, iconColor, section, title, subtitle } = cfg;
  return (
    <div className="flex items-center gap-4">
      <div className={`w-11 h-11 rounded-[12px] ${iconBg} flex items-center justify-center ${iconColor} shadow-sm border ${iconBorder} shrink-0`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5 min-w-0">
          <span className="text-gray-900 hidden sm:inline">{section}</span>
          <span className="text-gray-300 hidden sm:inline">/</span>
          <span className="text-[#1a2b4b] font-bold truncate">{title}</span>
        </div>
        <p className="text-[10.5px] text-gray-500 font-semibold leading-none truncate hidden sm:block">{subtitle}</p>
      </div>
    </div>
  );
};

export const AdminTopbar = ({ customTitle }: { customTitle?: React.ReactNode, currentUser?: any, setCurrentUser?: any }) => {
  const location = useLocation();




  // Soporta /admin/* y /tecnico/* (resuelve por el último segmento de la ruta)
  const lastSeg = location.pathname.split('/').filter(Boolean).pop() || '';
  const cfg = ROUTES[location.pathname] ?? ROUTES['/admin/' + lastSeg];
  const resolvedTitle = customTitle ?? (cfg ? <TopbarTitle cfg={cfg} /> : (
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-[12px] bg-gray-50 flex items-center justify-center text-gray-500 shadow-sm border border-gray-200 shrink-0">
        <LayoutGrid className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">
          <span className="text-gray-900">ESPOCH</span>
          <span className="text-gray-300">/</span>
          <span className="text-[#1a2b4b] font-bold">Sistema</span>
        </div>
        <p className="text-[10.5px] text-gray-500 font-semibold leading-none">Sistema de gestión de laboratorios y recursos.</p>
      </div>
    </div>
  ));


  return (
    <>
      {/* Solo en móvil. En escritorio el título ya lo pone el hero de cada página, así que la
          barra no aportaba nada y sí costaba alto. Debajo de lg tiene que quedarse: el botón
          de menú es lo ÚNICO que abre el sidebar cuando este es un drawer. */}
      <header className="lg:hidden relative h-[60px] bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-4 sm:px-6 shrink-0 z-40 gap-2">
      <div className="flex items-center h-full min-w-0 gap-2">
        <button
          onClick={() => useSidebarStore.getState().toggleMobile()}
          className="lg:hidden text-gray-500 hover:text-gray-800 shrink-0 p-1"
          title="Menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        {resolvedTitle}
      </div>

    </header>

    </>
  );
};
