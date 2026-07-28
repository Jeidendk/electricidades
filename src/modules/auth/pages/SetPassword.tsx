import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, GraduationCap, Zap, ArrowLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// Pantalla a la que llega el usuario invitado tras hacer clic en el enlace de un solo uso
// enviado a su correo. La sesión ya viene establecida por el enlace mágico de Supabase;
// aquí sólo define su contraseña con updateUser({ password }).
export const SetPassword = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // El cliente de Supabase procesa el token del enlace en la URL (detectSessionInUrl).
    // Damos un pequeño margen y luego verificamos que exista sesión.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);
      setChecking(false);
    };
    const t = setTimeout(check, 600);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass.length < 8) {
      Swal.fire({ icon: 'warning', title: 'Contraseña muy corta', text: 'Usa al menos 8 caracteres.', confirmButtonColor: '#B00020' });
      return;
    }
    if (pass !== confirm) {
      Swal.fire({ icon: 'error', title: 'No coinciden', text: 'Las contraseñas no son iguales.', confirmButtonColor: '#B00020' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setSubmitting(false);
    if (error) {
      Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: error.message, confirmButtonColor: '#B00020' });
      return;
    }
    await supabase.auth.signOut();
    Swal.fire({
      icon: 'success',
      title: '¡Contraseña establecida!',
      text: 'Ya puedes iniciar sesión con tu nueva contraseña.',
      confirmButtonColor: '#B00020',
    }).then(() => navigate('/login'));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[url('/background.png')] bg-cover bg-center relative px-4 font-sans">
      <div className="absolute inset-0 bg-white/40 dark:bg-[#0d1218]/80 backdrop-blur-[4px]"></div>

      <div className="relative z-10 w-full max-w-[440px] bg-[#f6f7f9] dark:bg-[#22272e]/90 backdrop-blur-xl border border-white/80 dark:border-gray-500/20 rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-espoch-red p-2 rounded-xl shadow-[0_4px_15px_rgba(176,0,0,0.4)]">
            <GraduationCap className="text-white w-7 h-7" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-900 dark:text-white text-xl font-bold tracking-tight leading-none">ESPOCH</span>
            <span className="text-espoch-red dark:text-espoch-yellow text-[9px] font-bold tracking-[0.18em] mt-1 flex items-center gap-1 uppercase">
              <Zap className="w-3 h-3 fill-current" /> ELECTRICIDAD
            </span>
          </div>
        </div>

        {checking ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 border-4 border-espoch-red border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-gray-500 font-semibold">Validando enlace…</span>
          </div>
        ) : !hasSession ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-espoch-red" strokeWidth={1.5} />
            </div>
            <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">Enlace inválido o expirado</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
              El enlace de acceso no es válido o ya caducó. Pide a un administrador que te reenvíe la invitación.
            </p>
            <button onClick={() => navigate('/login')} className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-espoch-red hover:text-espoch-darkred transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Ir al inicio de sesión
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center gap-2 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-espoch-red/10 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-espoch-red" strokeWidth={1.5} />
              </div>
              <h2 className="text-[20px] font-bold text-gray-900 dark:text-white tracking-tight">Establece tu contraseña</h2>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Crea la contraseña con la que ingresarás al sistema.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block uppercase tracking-wider">Nueva contraseña</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={pass} onChange={e => setPass(e.target.value)} required minLength={8} placeholder="••••••••"
                    className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-sm rounded-xl py-3 px-4 pr-10 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-espoch-red transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1.5 block uppercase tracking-wider">Confirmar contraseña</label>
                <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} placeholder="••••••••"
                  className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-sm rounded-xl py-3 px-4 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 transition-all" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-espoch-red hover:bg-espoch-darkred disabled:opacity-50 transition-all text-white font-bold text-[12px] py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_6px_15px_rgba(176,0,0,0.3)] mt-2">
                {submitting ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <ShieldCheck className="w-4 h-4" />}
                GUARDAR CONTRASEÑA
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default SetPassword;
