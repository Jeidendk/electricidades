import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, GraduationCap, Clock, Building2, GraduationCap as GradCap, BarChart2, Eye, LayoutGrid } from 'lucide-react';
import { useSidebarStore } from '../../../store/sidebarStore';
import { MenuUsuario } from '../../../components/ui/MenuUsuario';
import { useAuthStore, ETIQUETA_ROL } from '../../../store/authStore';

/**
 * Menú de Decano, Subdecano y Coordinador. Son cuatro pantallas de consulta y ninguna de
 * gestión, así que no hay submenús: la lista entera cabe a la vista.
 */
export const AutoridadSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const mobileOpen = useSidebarStore(s => s.mobileOpen);
  const setMobileOpen = useSidebarStore(s => s.setMobileOpen);
  const rol = useAuthStore(s => s.user?.role);

  useEffect(() => { setMobileOpen(false); }, [location.pathname, setMobileOpen]);

  const [time, setTime] = useState('--:--');
  const [day, setDay] = useState('CARGANDO');
  const [dateStr, setDateStr] = useState('---');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
      setDay(days[now.getDay()]);
      setDateStr(now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-4 px-6 py-3 transition-colors text-sm font-medium ${
      isActive ? 'text-white bg-espoch-sidebarhover border-l-[3px] border-espoch-yellow font-bold' : 'text-gray-400 hover:text-white hover:bg-espoch-sidebarhover'
    } ${collapsed ? 'justify-center px-0' : ''}`;

  const opciones = [
    { to: '/autoridad/dashboard', etiqueta: 'DASHBOARD', Icon: LayoutGrid },
    { to: '/autoridad/horarios', etiqueta: 'HORARIOS', Icon: Clock },
    { to: '/autoridad/infraestructura', etiqueta: 'INFRAESTRUCTURA', Icon: Building2 },
    { to: '/autoridad/estructura-academica', etiqueta: 'ESTRUC. ACAD.', Icon: GradCap },
    { to: '/autoridad/reportes', etiqueta: 'REPORTES', Icon: BarChart2 },
  ];

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-[55] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div className={`flex h-full transition-transform duration-300 lg:transition-all
        fixed inset-y-0 left-0 z-[60] w-[260px] lg:relative lg:z-[90]
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}`}>
        <aside className="bg-espoch-sidebar text-gray-400 flex flex-col h-full w-full z-50 shadow-2xl transition-all duration-300 relative overflow-visible">

          <div className="h-[80px] flex items-center px-5 border-b border-gray-800 shrink-0 overflow-hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-espoch-red p-2.5 rounded-xl shadow-[0_0_15px_rgba(176,0,0,0.5)] border border-red-500/30 shrink-0">
                <GraduationCap className="text-white w-6 h-6" strokeWidth={2.5} />
              </div>
              {!collapsed && (
                <div className="flex flex-col overflow-hidden transition-opacity duration-300">
                  <span className="text-xl font-extrabold tracking-tight text-white leading-none whitespace-nowrap">ESPOCH</span>
                  {/* La etiqueta sale del rol: los tres comparten panel y así cada uno ve el suyo. */}
                  <span className="text-espoch-yellow text-[9px] font-bold tracking-[0.2em] mt-1 whitespace-nowrap">
                    {rol ? ETIQUETA_ROL[rol].toUpperCase() : 'AUTORIDAD'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="fixed top-[90px] w-7 h-7 bg-gray-800 rounded-full hidden lg:flex items-center justify-center shadow-lg border-2 border-white text-white cursor-pointer hover:bg-gray-700 hover:scale-110 transition-all duration-300 z-[100]"
            style={{ left: collapsed ? 'calc(72px - 14px)' : 'calc(260px - 14px)' }}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>

          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
            {/* Que el panel es de consulta se dice de entrada, no se deja deducir de que no
                haya botones de guardar. */}
            {!collapsed && (
              <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-gray-800 bg-black/20 px-3 py-2">
                <Eye className="h-3.5 w-3.5 shrink-0 text-espoch-yellow" />
                <span className="text-[10px] font-bold leading-tight text-gray-400">Modo consulta: sin edición</span>
              </div>
            )}

            {opciones.map(({ to, etiqueta, Icon }) => (
              <NavLink key={to} to={to} className={navLinkClass} title={collapsed ? etiqueta : ''}>
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap overflow-hidden">{etiqueta}</span>}
              </NavLink>
            ))}
          </nav>

          {!collapsed && (
            <div className="px-5 py-3 border-t border-gray-800 shrink-0">
              <div className="text-[10px] font-bold tracking-widest text-gray-500">{day}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-white leading-none">{time}</span>
                <span className="text-[10px] text-gray-500 font-semibold">{dateStr}</span>
              </div>
            </div>
          )}

          <MenuUsuario colapsado={collapsed} />
        </aside>
      </div>
    </>
  );
};
