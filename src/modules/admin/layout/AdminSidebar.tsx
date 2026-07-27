import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutGrid, FileText, MonitorSpeaker, ChevronLeft,
    GraduationCap, LogOut, ChevronDown, Building2,
    Users, BarChart2, Clock, Library, Landmark, Inbox
} from 'lucide-react';
import { useSidebarStore } from '../../../store/sidebarStore';

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const mobileOpen = useSidebarStore(s => s.mobileOpen);
  const setMobileOpen = useSidebarStore(s => s.setMobileOpen);
  const [recursosOpen, setRecursosOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = location.pathname;

  // Cierra el drawer móvil al cambiar de página.
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

  const isRecursosSection = ['/admin/recursos', '/admin/formatos'].includes(currentPage);

  useEffect(() => {
    if (isRecursosSection) setRecursosOpen(true);
  }, [isRecursosSection]);

  const toggleSubmenu = (menu: 'recursos') => {
    if (collapsed) setCollapsed(false);
    setRecursosOpen(menu === 'recursos' ? !recursosOpen : false);
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-4 px-6 py-3 transition-colors text-sm font-medium ${
      isActive ? 'text-white bg-espoch-sidebarhover border-l-[3px] border-espoch-yellow font-bold' : 'text-gray-400 hover:text-white hover:bg-espoch-sidebarhover'
    } ${collapsed ? 'justify-center px-0' : ''}`;

  return (
    <>
      {/* Backdrop del drawer en móvil */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-[55] lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div className={`flex h-full transition-transform duration-300 lg:transition-all
        fixed inset-y-0 left-0 z-[60] w-[260px] lg:static lg:z-auto
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}`}>
      <aside className="bg-espoch-sidebar text-gray-400 flex flex-col h-full w-full z-50 shadow-2xl transition-all duration-300 relative overflow-visible">
        
        {/* Logo */}
        <div className="h-[80px] flex items-center px-5 border-b border-gray-800 shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-espoch-red p-2.5 rounded-xl shadow-[0_0_15px_rgba(176,0,0,0.5)] border border-red-500/30 shrink-0">
              <GraduationCap className="text-white w-6 h-6" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="flex flex-col overflow-hidden transition-opacity duration-300">
                <span className="text-xl font-extrabold tracking-tight text-white leading-none whitespace-nowrap">ESPOCH</span>
                <span className="text-espoch-yellow text-[9px] font-bold tracking-[0.2em] mt-1 whitespace-nowrap">ELECTRICIDAD</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggle btn — flotante (fixed) para que ningún contenedor lo recorte */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="fixed top-[90px] w-7 h-7 bg-gray-800 rounded-full hidden lg:flex items-center justify-center shadow-lg border-2 border-white text-white cursor-pointer hover:bg-gray-700 hover:scale-110 transition-all duration-300 z-[70]"
          style={{ left: collapsed ? 'calc(72px - 14px)' : 'calc(260px - 14px)' }}
          title={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
          {/* 1 · DASHBOARD */}
          <NavLink to="/admin/dashboard" className={navLinkClass} title={collapsed ? "DASHBOARD" : ""}>
            <LayoutGrid className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">DASHBOARD</span>}
          </NavLink>

          {/* 2 · TRÁMITES (Solicitudes + Préstamos unificados) */}
          <NavLink to="/admin/tramites" className={navLinkClass} title={collapsed ? "TRÁMITES" : ""}>
            <Inbox className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">TRÁMITES</span>}
          </NavLink>

          {/* 3 · HORARIOS */}
          <NavLink to="/admin/horarios" className={navLinkClass} title={collapsed ? "HORARIOS" : ""}>
            <Clock className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">HORARIOS</span>}
          </NavLink>

          {/* 4 · ACTIVOS (Inventario + Asignaciones + Mantenimiento unificados) */}
          <NavLink to="/admin/activos" className={navLinkClass} title={collapsed ? "ACTIVOS" : ""}>
            <MonitorSpeaker className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">ACTIVOS</span>}
          </NavLink>



          {/* 7 · INFRAESTRUCTURA (Edificios + Espacios unificados) */}
          <NavLink to="/admin/infraestructura" className={navLinkClass} title={collapsed ? "INFRAESTRUCTURA" : ""}>
            <Building2 className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">INFRAESTRUCTURA</span>}
          </NavLink>



          {/* 7 · ESTRUCTURA ACADÉMICA */}
          <NavLink to="/admin/estructura-academica" className={navLinkClass} title={collapsed ? "ESTRUCTURA ACADÉMICA" : ""}>
            <Landmark className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">ESTRUCTURA ACADÉMICA</span>}
          </NavLink>

          {/* 8 · RECURSOS (Recursos / Formatos) */}
          <div className="flex flex-col relative">
            <button
              onClick={() => toggleSubmenu('recursos')}
              className={`w-full flex items-center justify-between px-6 py-3 transition-colors text-sm font-medium cursor-pointer ${
                isRecursosSection ? 'text-white bg-espoch-sidebarhover border-l-[3px] border-espoch-yellow font-bold' : 'text-gray-400 hover:text-white hover:bg-espoch-sidebarhover'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? "RECURSOS" : ""}
            >
              <div className="flex items-center gap-4">
                <Library className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">RECURSOS</span>}
              </div>
              {!collapsed && <ChevronDown className={`w-4 h-4 transition-transform duration-300 shrink-0 ${recursosOpen ? 'rotate-180' : ''}`} />}
            </button>
            {(!collapsed && recursosOpen) && (
              <div className="flex flex-col ml-[34px] border-l border-gray-800 mt-1 mb-2 space-y-1 py-1 pr-4 animate-fade-in">
                <NavLink to="/admin/recursos" className={({isActive}) => `flex items-center gap-3 pl-5 pr-4 py-2.5 text-[11px] font-semibold hover:text-white transition-all ml-1 ${isActive ? 'bg-espoch-red text-white font-extrabold rounded-lg shadow-sm' : 'text-gray-400'}`}>
                  <Library className="w-4 h-4 shrink-0" /> <span>MATERIAL ACAD.</span>
                </NavLink>
                <NavLink to="/admin/formatos" className={({isActive}) => `flex items-center gap-3 pl-5 pr-4 py-2.5 text-[11px] font-semibold hover:text-white transition-all ml-1 ${isActive ? 'bg-espoch-red text-white font-extrabold rounded-lg shadow-sm' : 'text-gray-400'}`}>
                  <FileText className="w-4 h-4 shrink-0" /> <span>FORMATOS</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* 10 · USUARIOS */}
          <NavLink to="/admin/usuarios" className={navLinkClass} title={collapsed ? "USUARIOS" : ""}>
            <Users className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">USUARIOS</span>}
          </NavLink>



          {/* 12 · REPORTES */}
          <NavLink to="/admin/reportes" className={navLinkClass} title={collapsed ? "REPORTES" : ""}>
            <BarChart2 className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap overflow-hidden">REPORTES</span>}
          </NavLink>
        </nav>

        {/* Reloj */}
        {!collapsed && (
          <div className="mt-auto w-full flex justify-center pb-8 pt-4 overflow-hidden animate-fade-in">
            <div className="w-[150px] h-[150px] rounded-full bg-[#0a0d11] border-[12px] border-[#131921] shadow-[0_0_25px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center relative shrink-0">
              <div className="absolute inset-0 rounded-full shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] pointer-events-none"></div>
              <span className="text-[40px] font-bold text-white tracking-tighter leading-none mt-2 z-10">{time}</span>
              <span className="text-[10px] font-extrabold text-[#ffc107] uppercase tracking-[0.2em] mt-2 z-10">{day}</span>
              <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mt-1 z-10">{dateStr}</span>
            </div>
          </div>
        )}

        {/* Logout */}
        <div className="mx-4 py-5 flex items-center justify-center border-t border-gray-800 shrink-0">
          <button 
            onClick={handleLogout}
            title={collapsed ? "CERRAR SESIÓN" : ""}
            className={`flex items-center justify-start gap-3 text-gray-400 hover:text-white transition-colors text-xs font-bold tracking-widest w-full px-2 py-2 rounded-lg ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">CERRAR SESIÓN</span>}
          </button>
        </div>
      </aside>
      </div>
    </>
  );
};
