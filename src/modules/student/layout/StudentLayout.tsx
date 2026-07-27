import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, Search, Bell, ShoppingCart, ChevronDown, User, Settings, LogOut, ShieldCheck, Eye, Wrench, Users } from 'lucide-react';
import { useState } from 'react';
import { useCartStore } from '../../../store/cartStore';
import { ThemeToggle } from '../../../components/ui/ThemeToggle';
import { Avatar } from '../../../components/ui/Avatar';
import { ConfigModal } from '../../../components/ui/ConfigModal';
import { useAuthStore } from '../../../store/authStore';
import { useEffect } from 'react';
import { useInventarioStore } from '../../../store/inventarioStore';
import { useEspaciosStore } from '../../../store/espaciosStore';
import { useRecursosStore } from '../../../store/recursosStore';
import { MfaSetupModal } from '../../auth/components/MfaSetupModal';

export const StudentLayout = () => {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const cartTotal = useCartStore(state => state.cartTotal());
  const cartOpen = useCartStore(state => state.cartOpen);
  const setCartOpen = useCartStore(state => state.setCartOpen);

  const authUser = useAuthStore(s => s.user);
  const isAdmin = authUser?.role === 'admin';

  const student = {
    nombre: authUser?.nombre || 'Estudiante',
    rol: authUser?.rol || 'Estudiante',
    avatar: authUser?.avatar || null,
  };

  useEffect(() => {
    // Al cargar la vista de estudiante, obtenemos datos necesarios
    useInventarioStore.getState().fetchItems();
    useEspaciosStore.getState().fetchEspacios();
    useRecursosStore.getState().fetchRecursos();
  }, []);

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden text-gray-800 bg-[#f4f7fb]/90 font-sans">
      {/* TOPBAR INTEGRADO NATIVAMENTE */}
      <div className="shrink-0 z-50 relative">
        <header className="h-[60px] lg:h-[70px] bg-white/90 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-3 sm:px-5 lg:px-10 flex-shrink-0 shadow-sm">
          
          {/* Izquierda: Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-espoch-red p-1.5 lg:p-2 rounded-lg shadow-[0_0_10px_rgba(176,0,0,0.3)]">
              <GraduationCap className="text-white w-4 h-4 lg:w-5 lg:h-5" strokeWidth={2.5} />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-base lg:text-lg font-extrabold tracking-tight text-gray-900 leading-none">ESPOCH</span>
              <span className="text-espoch-red text-[7px] lg:text-[8px] font-black tracking-[0.2em] mt-0.5">ELECTRICIDAD</span>
            </div>
          </div>

          {/* Centro: Navegación Principal */}
          <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <NavLink 
              to="/student/catalog" 
              className={({ isActive }) => `px-3 xl:px-4 py-2 rounded-full text-sm font-bold transition-all ${isActive ? 'bg-espoch-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              Catálogo
            </NavLink>
            <NavLink 
              to="/student/requests" 
              className={({ isActive }) => `px-3 xl:px-4 py-2 rounded-full text-sm font-bold transition-all ${isActive ? 'bg-espoch-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              Mis Solicitudes
            </NavLink>
            <NavLink
              to="/student/horarios"
              className={({ isActive }) => `px-3 xl:px-4 py-2 rounded-full text-sm font-bold transition-all ${isActive ? 'bg-espoch-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              Horarios
            </NavLink>
            <NavLink
              to="/student/map"
              className={({ isActive }) => `px-3 xl:px-4 py-2 rounded-full text-sm font-bold transition-all ${isActive ? 'bg-espoch-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              Ubicaciones
            </NavLink>
            <NavLink
              to="/student/recursos"
              className={({ isActive }) => `px-3 xl:px-4 py-2 rounded-full text-sm font-bold transition-all ${isActive ? 'bg-espoch-red text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              Recursos
            </NavLink>
          </nav>

          {/* Derecha: Iconos — todo en una sola fila compacta */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <ThemeToggle className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center hover:bg-gray-100" />
            <button className="w-7 h-7 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors relative">
              <Bell className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-espoch-red rounded-full"></span>
            </button>

            {/* Cart Button */}
            <button 
              onClick={() => setCartOpen(!cartOpen)}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-espoch-red hover:bg-espoch-darkred text-white text-[11px] sm:text-[12px] font-extrabold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all relative"
            >
              <ShoppingCart className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">Mi Solicitud</span>
              {cartTotal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-espoch-yellow text-gray-900 text-[10px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {cartTotal}
                </span>
              )}
            </button>
            
            {/* Perfil de usuario */}
            <div className="relative">
              <div 
                className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group hover:bg-gray-50 rounded-xl sm:rounded-2xl px-1.5 sm:px-3 py-1.5 transition-colors select-none"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-[11px] sm:text-[12px] font-black text-gray-900 leading-none truncate max-w-[90px]">{student.nombre}</span>
                  <span className="text-[8px] sm:text-[9px] text-gray-500 font-bold mt-1">{student.rol}</span>
                </div>
                <Avatar nombre={student.nombre} src={student.avatar} className="w-8 h-8 lg:w-9 lg:h-9 text-[10px] shrink-0" />
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 group-hover:text-gray-700 ${profileOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Menu */}
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 z-50 flex flex-col p-1.5 animate-fade-in">
                    <div className="py-0.5">
                      <button className="w-full text-left px-3 py-2 text-[13px] text-gray-700 font-semibold hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors">
                        <User className="w-4 h-4 text-gray-400" />
                        Mi Perfil
                      </button>
                      <button 
                        onClick={() => { setMfaModalOpen(true); setProfileOpen(false); }}
                        className="w-full text-left px-3 py-2 text-[13px] text-gray-700 font-semibold hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                      >
                        <ShieldCheck className="w-4 h-4 text-gray-400" />
                        Seguridad (2FA)
                      </button>
                      <button
                        onClick={() => { setConfigOpen(true); setProfileOpen(false); }}
                        className="w-full text-left px-3 py-2 text-[13px] text-gray-700 font-semibold hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        Configuración
                      </button>
                    </div>

                    {/* Selector de vista — solo admin */}
                    {isAdmin && (
                      <>
                        <div className="h-px bg-gray-100 my-1 mx-2"></div>
                        <div className="px-3 py-1.5">
                          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Eye className="w-3 h-3" /> Ver como</span>
                        </div>
                        <div className="px-1.5 pb-1 flex gap-1">
                          {([['/admin', 'Admin', Users], ['/tecnico/dashboard', 'Técnico', Wrench], ['/student/catalog', 'Estudiante', GraduationCap]] as const).map(([path, label, Icon]) => (
                            <button
                              key={path}
                              onClick={() => { setProfileOpen(false); navigate(path); }}
                              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${label === 'Estudiante' ? 'bg-espoch-ink text-white' : 'text-gray-500 hover:bg-gray-100'}`}
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
                      <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-[13px] text-espoch-red font-bold hover:bg-red-50 rounded-lg flex items-center gap-3 transition-colors">
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Navegación móvil (scroll horizontal) — el nav central se oculta en <lg */}
        <nav className="lg:hidden flex items-center gap-2 overflow-x-auto custom-scrollbar px-4 py-2 bg-white/90 border-b border-gray-200/50">
          {[
            { to: '/student/catalog', label: 'Catálogo' },
            { to: '/student/requests', label: 'Mis Solicitudes' },
            { to: '/student/horarios', label: 'Horarios' },
            { to: '/student/map', label: 'Ubicaciones' },
            { to: '/student/recursos', label: 'Recursos' },
          ].map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap shrink-0 transition-all ${isActive ? 'bg-espoch-red text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* CONTENIDO (AQUÍ SE RENDERIZA EL OUTLET) */}
      <main className="flex-1 min-h-0 relative flex flex-col">
        <Outlet />
      </main>

      {/* MODAL DE SEGURIDAD MFA */}
      <MfaSetupModal isOpen={mfaModalOpen} onClose={() => setMfaModalOpen(false)} />
      {/* MODAL DE CONFIGURACIÓN */}
      <ConfigModal isOpen={configOpen} onClose={() => setConfigOpen(false)} />
    </div>
  );
};
