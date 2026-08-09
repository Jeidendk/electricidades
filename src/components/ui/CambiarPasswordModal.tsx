import { useEffect, useState } from 'react';
import { X, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useExclusiveModal } from '../../hooks/useExclusiveModal';

/** Longitud mínima, la misma que exige la pantalla de definir contraseña. */
const MIN_CARACTERES = 8;

interface CambiarPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CampoContrasenaProps {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  autoComplete: string;
  visible: boolean;
  deshabilitado: boolean;
}

// Definido fuera del modal a propósito: si se declarara dentro, cada tecla recrearía
// el componente y el input perdería el foco.
const CampoContrasena = ({ etiqueta, valor, alCambiar, autoComplete, visible, deshabilitado }: CampoContrasenaProps) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">{etiqueta}</label>
    <input
      type={visible ? 'text' : 'password'}
      value={valor}
      onChange={e => alCambiar(e.target.value)}
      autoComplete={autoComplete}
      disabled={deshabilitado}
      placeholder="••••••••"
      className="w-full bg-gray-50/50 text-[13px] text-gray-900 rounded-xl py-2.5 px-4 outline-none border border-gray-200 focus:border-red-500 focus:bg-white font-medium transition-all disabled:opacity-60"
    />
  </div>
);

/** Traduce el error de Supabase a un mensaje que el usuario pueda accionar. */
const mensajeDeError = (error: { message?: string } | null): string => {
  const original = error?.message || '';
  if (/invalid login credentials/i.test(original)) return 'La contraseña actual no es correcta.';
  if (/should be different/i.test(original)) return 'La nueva contraseña debe ser distinta de la actual.';
  if (/at least/i.test(original)) return `La contraseña debe tener al menos ${MIN_CARACTERES} caracteres.`;
  if (/rate limit|too many/i.test(original)) return 'Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.';
  return original || 'No se pudo cambiar la contraseña.';
};

export const CambiarPasswordModal = ({ isOpen, onClose }: CambiarPasswordModalProps) => {
  useExclusiveModal('cambiar-password', isOpen, onClose);

  const user = useAuthStore(s => s.user);

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Con 2FA activa la sesión ya probó posesión del segundo factor, así que no se pide la
  // contraseña actual: verificarla obligaría a reiniciar sesión y volver a pasar el 2FA.
  const [pideContrasenaActual, setPideContrasenaActual] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setActual(''); setNueva(''); setConfirmacion(''); setError(''); setMostrar(false);

    let cancelado = false;
    supabase.auth.mfa.listFactors()
      .then(({ data }) => {
        if (cancelado) return;
        const tieneSegundoFactor = (data?.totp || []).some(f => f.status === 'verified');
        setPideContrasenaActual(!tieneSegundoFactor);
      })
      .catch(() => { if (!cancelado) setPideContrasenaActual(true); });

    return () => { cancelado = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const validar = (): string => {
    if (pideContrasenaActual && !actual) return 'Escribe tu contraseña actual.';
    if (nueva.length < MIN_CARACTERES) return `La nueva contraseña debe tener al menos ${MIN_CARACTERES} caracteres.`;
    if (nueva !== confirmacion) return 'La confirmación no coincide con la nueva contraseña.';
    if (pideContrasenaActual && nueva === actual) return 'La nueva contraseña debe ser distinta de la actual.';
    return '';
  };

  /** Comprueba que quien está frente a la pantalla conoce la contraseña vigente. */
  const contrasenaActualEsValida = async (): Promise<boolean> => {
    const correo = user?.email || (await supabase.auth.getUser()).data.user?.email;
    if (!correo) {
      setError('No se pudo verificar tu identidad: tu cuenta no tiene correo registrado.');
      return false;
    }

    const { error: errorAcceso } = await supabase.auth.signInWithPassword({ email: correo, password: actual });
    if (errorAcceso) {
      setError(mensajeDeError(errorAcceso));
      return false;
    }
    return true;
  };

  const handleGuardar = async (evento: React.FormEvent) => {
    evento.preventDefault();

    const problema = validar();
    if (problema) { setError(problema); return; }

    setGuardando(true);
    setError('');
    try {
      if (pideContrasenaActual && !(await contrasenaActualEsValida())) return;

      const { error: errorActualizacion } = await supabase.auth.updateUser({ password: nueva });
      if (errorActualizacion) { setError(mensajeDeError(errorActualizacion)); return; }

      // Las sesiones abiertas en otros dispositivos quedan con la contraseña anterior: se cierran.
      // Si falla, el cambio ya se guardó y no debe bloquearse por esto.
      const { error: errorCierre } = await supabase.auth.signOut({ scope: 'others' });
      const sesionesCerradas = !errorCierre;

      onClose();
      Swal.fire({
        icon: 'success',
        title: 'Contraseña actualizada',
        text: sesionesCerradas
          ? 'Usa la nueva contraseña la próxima vez que inicies sesión. Se cerraron las sesiones abiertas en otros dispositivos.'
          : 'Usa la nueva contraseña la próxima vez que inicies sesión.',
        confirmButtonColor: '#B00020',
      });
    } catch (fallo: any) {
      setError(fallo?.message || 'No se pudo cambiar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={guardando ? undefined : onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[17px] font-extrabold tracking-tight text-gray-900">Cambiar contraseña</h3>
              <p className="mt-0.5 text-[11px] font-medium text-gray-500">Se aplica a tu cuenta de acceso.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleGuardar} className="flex flex-col gap-4 overflow-y-auto px-6 py-5 custom-scrollbar">
          {!pideContrasenaActual && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-[11px] font-medium text-emerald-800">
                Tu cuenta tiene verificación en dos pasos activa, así que no hace falta repetir la contraseña actual.
              </p>
            </div>
          )}

          {pideContrasenaActual && (
            <CampoContrasena etiqueta="Contraseña actual" valor={actual} alCambiar={setActual} autoComplete="current-password" visible={mostrar} deshabilitado={guardando} />
          )}
          <CampoContrasena etiqueta="Nueva contraseña" valor={nueva} alCambiar={setNueva} autoComplete="new-password" visible={mostrar} deshabilitado={guardando} />
          <CampoContrasena etiqueta="Repite la nueva contraseña" valor={confirmacion} alCambiar={setConfirmacion} autoComplete="new-password" visible={mostrar} deshabilitado={guardando} />

          <button
            type="button"
            onClick={() => setMostrar(v => !v)}
            className="flex items-center gap-2 self-start text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            {mostrar ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {mostrar ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
          </button>

          <p className="text-[11px] font-medium text-gray-500">
            Mínimo {MIN_CARACTERES} caracteres. Al guardar se cerrarán las sesiones abiertas en otros dispositivos.
          </p>

          {error && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-3 text-[13px] font-bold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 rounded-xl bg-red-700 py-3 text-[13px] font-bold text-white shadow-md transition-all hover:bg-red-800 disabled:opacity-50"
            >
              {guardando ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
