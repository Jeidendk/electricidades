import { useState } from 'react';
import { ChevronUp, Settings, ShieldCheck, KeyRound, User, LogOut, Eye, Users, Wrench, GraduationCap } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from './Avatar';
import { ConfigModal } from './ConfigModal';
import { ProfileModal } from './ProfileModal';
import { CambiarPasswordModal } from './CambiarPasswordModal';
import { MfaSetupModal } from '../../modules/auth/components/MfaSetupModal';

/**
 * Menú de cuenta del pie del sidebar: perfil, seguridad, configuración, "ver como" y salir.
 *
 * Vive aquí y no en cada sidebar porque admin y técnico comparten exactamente las mismas
 * opciones, y duplicarlo significaría mantener dos copias de los cuatro modales.
 *
 * El panel se abre hacia ARRIBA: el disparador está pegado al borde inferior de la pantalla.
 */
export const MenuUsuario = ({ colapsado = false }: { colapsado?: boolean }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = useAuthStore(s => s.user);

  const [abierto, setAbierto] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [mfaAbierto, setMfaAbierto] = useState(false);
  const [passwordAbierto, setPasswordAbierto] = useState(false);
  const [configAbierta, setConfigAbierta] = useState(false);

  const esAdmin = usuario?.role === 'admin';

  // Vista activa según el prefijo de la URL (para el selector de vista del admin).
  const vistaActual: 'admin' | 'tecnico' | 'student' =
    location.pathname.startsWith('/tecnico') ? 'tecnico'
    : location.pathname.startsWith('/student') ? 'student'
    : 'admin';

  const cambiarVista = (vista: 'admin' | 'tecnico' | 'student') => {
    setAbierto(false);
    if (vista === vistaActual) return;
    navigate(vista === 'admin' ? '/admin' : vista === 'tecnico' ? '/tecnico/dashboard' : '/student/catalog');
  };

  const cerrarSesion = async () => {
    setAbierto(false);
    await useAuthStore.getState().logout();
    navigate('/login');
  };

  /** Abre un modal cerrando antes el desplegable, para que no queden los dos encima. */
  const abrirModal = (abrir: (v: boolean) => void) => {
    abrir(true);
    setAbierto(false);
  };

  const OPCIONES = [
    { etiqueta: 'Mi Perfil', Icono: User, accion: () => abrirModal(setPerfilAbierto) },
    { etiqueta: 'Seguridad (2FA)', Icono: ShieldCheck, accion: () => abrirModal(setMfaAbierto) },
    { etiqueta: 'Cambiar contraseña', Icono: KeyRound, accion: () => abrirModal(setPasswordAbierto) },
    // El modo oscuro vive dentro de Configuración; no se duplica el interruptor aquí.
    { etiqueta: 'Configuración', Icono: Settings, accion: () => abrirModal(setConfigAbierta) },
  ];

  const nombre = usuario?.nombre || 'Usuario';

  return (
    <div className="relative shrink-0 border-t border-gray-800/80 px-2 py-2">
      <button
        onClick={() => setAbierto(!abierto)}
        title={colapsado ? nombre : undefined}
        className={`w-full flex items-center gap-2.5 rounded-xl p-2 transition-colors hover:bg-espoch-sidebarhover ${colapsado ? 'justify-center' : ''}`}
      >
        <Avatar nombre={nombre} src={usuario?.avatar} className="w-8 h-8 text-[10px] shrink-0" />
        {!colapsado && (
          <>
            <div className="flex flex-col min-w-0 flex-1 text-left">
              <span className="text-[11px] font-bold text-white truncate leading-tight">{nombre}</span>
              <span className="text-[9px] text-gray-500 font-semibold capitalize">{usuario?.rol || ''}</span>
            </div>
            <ChevronUp className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${abierto ? '' : 'rotate-180'}`} />
          </>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-[95]" onClick={() => setAbierto(false)} />
          <div className="absolute bottom-full left-2 right-2 mb-2 min-w-[210px] bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[96] animate-fade-in">
            <div className="px-4 py-2 border-b border-gray-50 mb-1">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Opciones</span>
            </div>
            <div className="py-0.5">
              {OPCIONES.map(({ etiqueta, Icono, accion }) => (
                <button
                  key={etiqueta}
                  onClick={accion}
                  className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-gray-50 text-gray-700 transition-colors rounded-lg"
                >
                  <Icono className="w-4 h-4 text-gray-400" />
                  <span className="text-[12px] font-semibold">{etiqueta}</span>
                </button>
              ))}
            </div>

            {/* Selector de vista — solo admin (inspecciona técnico/estudiante) */}
            {esAdmin && (
              <>
                <div className="h-px bg-gray-100 my-1 mx-2" />
                <div className="px-4 py-1.5">
                  <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Eye className="w-3 h-3" /> Ver como
                  </span>
                </div>
                <div className="px-2 pb-1 flex gap-1">
                  {([['admin', 'Admin', Users], ['tecnico', 'Técnico', Wrench], ['student', 'Estudiante', GraduationCap]] as const).map(([clave, etiqueta, Icono]) => (
                    <button
                      key={clave}
                      onClick={() => cambiarVista(clave)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${vistaActual === clave ? 'bg-espoch-ink text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      <Icono className="w-4 h-4" />
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="h-px bg-gray-100 my-1 mx-2" />
            <button
              onClick={cerrarSesion}
              className="w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors rounded-lg"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-[12px] font-bold">Cerrar Sesión</span>
            </button>
          </div>
        </>
      )}

      <ProfileModal isOpen={perfilAbierto} onClose={() => setPerfilAbierto(false)} />
      <MfaSetupModal isOpen={mfaAbierto} onClose={() => setMfaAbierto(false)} />
      <CambiarPasswordModal isOpen={passwordAbierto} onClose={() => setPasswordAbierto(false)} />
      <ConfigModal isOpen={configAbierta} onClose={() => setConfigAbierta(false)} />
    </div>
  );
};
