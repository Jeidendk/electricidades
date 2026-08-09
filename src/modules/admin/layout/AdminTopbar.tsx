import { useState } from 'react';
import {
  LayoutGrid, Bell, Settings, ChevronDown,
  FileText, Package, Wrench, Users,
  GraduationCap, BookMarked, BarChart2, Building2, CalendarDays,
  BookOpen, Inbox, ShieldCheck, KeyRound, User, LogOut, Eye, Menu
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useUiPrefsStore } from '../../../store/uiPrefsStore';
import { useSidebarStore } from '../../../store/sidebarStore';
import { Avatar } from '../../../components/ui/Avatar';
import { ConfigModal } from '../../../components/ui/ConfigModal';
import { ProfileModal } from '../../../components/ui/ProfileModal';
import { CambiarPasswordModal } from '../../../components/ui/CambiarPasswordModal';
import { MfaSetupModal } from '../../auth/components/MfaSetupModal';
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

export const AdminTopbar = ({ customTitle, currentUser }: { customTitle?: React.ReactNode, currentUser?: any, setCurrentUser?: any }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const notificaciones = useUiPrefsStore(s => s.notificaciones);
  const authUser = useAuthStore(s => s.user);
  const isAdmin = authUser?.role === 'admin';

  // Vista activa según el prefijo de la URL (para el selector de vista del admin).
  const currentView: 'admin' | 'tecnico' | 'student' =
    location.pathname.startsWith('/tecnico') ? 'tecnico'
    : location.pathname.startsWith('/student') ? 'student'
    : 'admin';

  const switchView = (view: 'admin' | 'tecnico' | 'student') => {
    setShowUserDropdown(false);
    if (view === currentView) return;
    navigate(view === 'admin' ? '/admin' : view === 'tecnico' ? '/tecnico/dashboard' : '/student/catalog');
  };

  const handleLogout = async () => {
    setShowUserDropdown(false);
    await useAuthStore.getState().logout();
    navigate('/login');
  };

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

  const user = currentUser || { id: '', nombre: 'Usuario', rol: '', avatar: null };

  return (
    <>
      <header className="relative h-[80px] bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-40 gap-2">
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
      <div className="flex items-center gap-6">
        {notificaciones && (
          <>
            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-gray-700 relative" title="Notificaciones">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-espoch-yellow rounded-full border border-white"></span>
              </button>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
          </>
        )}
        <div className="relative">
          <div onClick={() => setShowUserDropdown(!showUserDropdown)} className="flex items-center gap-3 cursor-pointer group p-1 rounded-xl hover:bg-gray-50 transition-colors">
            <Avatar nombre={user.nombre} src={user.avatar} className="w-9 h-9 text-[11px]" />
            <div className="hidden xl:flex flex-col">
              <span className="text-[11px] font-bold text-gray-800 truncate leading-tight">{user.nombre}</span>
              <span className="text-[9px] text-gray-400 font-semibold">{user.rol}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors hidden xl:block" />
          </div>

          {showUserDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)}></div>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-fade-in">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Opciones</span>
                </div>
                <div className="py-0.5">
                  <button
                    onClick={() => { setProfileModalOpen(true); setShowUserDropdown(false); }}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-700 transition-colors rounded-lg"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-[12px] font-semibold">Mi Perfil</span>
                  </button>
                  <button
                    onClick={() => { setMfaModalOpen(true); setShowUserDropdown(false); }}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-700 transition-colors rounded-lg"
                  >
                    <ShieldCheck className="w-4 h-4 text-gray-400" />
                    <span className="text-[12px] font-semibold">Seguridad (2FA)</span>
                  </button>
                  <button
                    onClick={() => { setPasswordModalOpen(true); setShowUserDropdown(false); }}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-700 transition-colors rounded-lg"
                  >
                    <KeyRound className="w-4 h-4 text-gray-400" />
                    <span className="text-[12px] font-semibold">Cambiar contraseña</span>
                  </button>
                  {/* Configuración (el modo oscuro vive dentro de Configuración; sin duplicar toggle) */}
                  <button
                    onClick={() => { setConfigOpen(true); setShowUserDropdown(false); }}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-700 transition-colors rounded-lg"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    <span className="text-[12px] font-semibold">Configuración</span>
                  </button>
                </div>

                {/* Selector de vista — solo admin (inspecciona técnico/estudiante) */}
                {isAdmin && (
                  <>
                    <div className="h-px bg-gray-100 my-1 mx-2"></div>
                    <div className="px-4 py-1.5">
                      <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Eye className="w-3 h-3" /> Ver como</span>
                    </div>
                    <div className="px-2 pb-1 flex gap-1">
                      {([['admin', 'Admin', Users], ['tecnico', 'Técnico', Wrench], ['student', 'Estudiante', GraduationCap]] as const).map(([key, label, Icon]) => (
                        <button
                          key={key}
                          onClick={() => switchView(key)}
                          className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${currentView === key ? 'bg-espoch-ink text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                <div className="py-0.5">
                  <button onClick={handleLogout}
                    className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors rounded-lg">
                    <LogOut className="w-4 h-4" />
                    <span className="text-[12px] font-bold">Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

      {/* MODAL DE SEGURIDAD MFA */}
      <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      <MfaSetupModal isOpen={mfaModalOpen} onClose={() => setMfaModalOpen(false)} />
      <CambiarPasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} />
      {/* MODAL DE CONFIGURACIÓN */}
      <ConfigModal isOpen={configOpen} onClose={() => setConfigOpen(false)} />
    </>
  );
};
