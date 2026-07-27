import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Moon, Sun, GraduationCap, Zap, Mail, LogIn, HelpCircle, Calendar, ArrowLeft, UserPlus, ChevronDown, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useThemeStore } from '../../../store/themeStore';
import { useFacultadesStore } from '../../../store/facultadesStore';
import { supabase } from '../../../lib/supabase';

// Periodos Académicos Ordinarios disponibles (ya no son "semestres").
const PAOS = Array.from({ length: 10 }, (_, i) => i + 1);

export const Login = () => {
  const navigate = useNavigate();
  const { login, verifyMfa } = useAuthStore();
  const isDark = useThemeStore(s => s.dark);
  const toggleTheme = useThemeStore(s => s.toggle);
  const facultades = useFacultadesStore(s => s.facultades);
  const carreras = useFacultadesStore(s => s.carreras);
  const fetchFacultades = useFacultadesStore(s => s.fetchAll);

  // Carga facultades/carreras reales para los selects del registro.
  useEffect(() => { fetchFacultades(); }, [fetchFacultades]);

  // Una sola variable controla qué panel se muestra: 'login' | 'register' | 'mfa'
  const [view, setView] = useState<'login' | 'register' | 'mfa'>('login');

  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [time, setTime] = useState(new Date());
  const [keepConnected, setKeepConnected] = useState(true);

  // Estados para contraseñas
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Campos del formulario de registro
  const [registerNombre, setRegisterNombre] = useState('');
  const [registerCodigo, setRegisterCodigo] = useState('');
  const [registerFacultad, setRegisterFacultad] = useState('');
  const [registerCarrera, setRegisterCarrera] = useState('');
  const [registerPao, setRegisterPao] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Carreras de la facultad seleccionada (cascada).
  const carrerasFiltradas = carreras.filter((c) => c.id_facultad === registerFacultad);

  const evaluatePassword = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[a-zA-Z]/.test(pass)) score += 1; // Tiene letras
    if (/[0-9]/.test(pass)) score += 1;    // Tiene números
    if (/[^A-Za-z0-9]/.test(pass)) score += 1; // Tiene caracteres especiales

    if (pass.length === 0) return { score: 0, text: '', color: 'bg-gray-200' };
    if (score <= 2) return { score: 1, text: 'Débil', color: 'bg-red-500' };
    if (score === 3) return { score: 2, text: 'Buena', color: 'bg-espoch-yellow' };
    return { score: 3, text: 'Fuerte', color: 'bg-green-500' };
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pass = e.target.value;
    setRegisterPassword(pass);
    setPasswordStrength(evaluatePassword(pass));
  };

  const [registerPassword, setRegisterPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });

  // Estados para autocompletado de correos
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>, currentVal: string) => {
    const value = e.target.value;
    // Solo autocompleta si el usuario está escribiendo (agregando caracteres)
    if (value.endsWith('@') && value.length > currentVal.length && !currentVal.includes('@')) {
      setter(value + 'espoch.edu.ec');
    } else {
      setter(value);
    }
  };

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dayString = time.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
  const dateString = time.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    Swal.fire({
      title: 'Iniciando sesión...',
      text: 'Por favor, espere',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const res = await login(loginEmail, loginPassword);
    
    // Si requiere MFA, mostrar la pantalla de verificación
    if (!res.success && res.requiresMfa) {
      Swal.close();
      setMfaFactorId(res.factorId);
      setMfaCode('');
      setView('mfa');
      return;
    }

    if (!res.success) {
      Swal.fire({
        icon: 'error',
        title: 'Error de Autenticación',
        text: res.message,
        confirmButtonColor: '#B00020'
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: '¡Bienvenido!',
      text: 'Inicio de sesión exitoso.',
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    }).then(() => {
      const userState = useAuthStore.getState().user;
      if (userState?.role === 'admin') navigate('/admin');
      else if (userState?.role === 'tecnico') navigate('/tecnico');
      else navigate('/student');
    });
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6) {
      Swal.fire({ icon: 'warning', title: 'Código inválido', text: 'El código debe tener exactamente 6 dígitos.', confirmButtonColor: '#B00020' });
      return;
    }
    setMfaLoading(true);
    const res = await verifyMfa(mfaFactorId, mfaCode);
    setMfaLoading(false);

    if (!res.success) {
      Swal.fire({ icon: 'error', title: 'Verificación Fallida', text: res.message, confirmButtonColor: '#B00020' });
      setMfaCode('');
      return;
    }

    Swal.fire({
      icon: 'success',
      title: '¡Verificación Exitosa!',
      text: 'Acceso concedido.',
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    }).then(() => {
      const userState = useAuthStore.getState().user;
      if (userState?.role === 'admin') navigate('/admin');
      else if (userState?.role === 'tecnico') navigate('/tecnico');
      else navigate('/student');
    });
  };


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerNombre.trim()) {
      Swal.fire({ icon: 'warning', title: 'Nombre requerido', text: 'Por favor ingresa tu nombre completo.', confirmButtonColor: '#B00020' });
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      Swal.fire({ icon: 'error', title: 'Contraseñas no coinciden', text: 'Verifica que ambas contraseñas sean iguales.', confirmButtonColor: '#B00020' });
      return;
    }
    if (passwordStrength.score < 2) {
      Swal.fire({ icon: 'warning', title: 'Contraseña débil', text: 'Usa al menos 8 caracteres con letras y números.', confirmButtonColor: '#B00020' });
      return;
    }

    Swal.fire({
      title: 'Registrando cuenta...',
      text: 'Por favor, espere',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const facultadSel = facultades.find((f) => f.id === registerFacultad);
    const carreraSel = carreras.find((c) => c.id === registerCarrera);
    const payload = {
      nombre: registerNombre.trim(),
      codigo_institucional: registerCodigo.trim(),
      facultad_id: registerFacultad,
      facultad_nombre: facultadSel?.nombre || '',
      carrera_id: registerCarrera,
      carrera_nombre: carreraSel?.nombre || '',
      pao: registerPao,
    };
    
    console.log("🚀 ENVIANDO A SUPABASE:", payload);

    const { data, error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        data: payload,
        // A dónde lleva el enlace de confirmación del correo.
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) {
      console.error("SignUp error:", error);
      let errorStr = '';
      if (typeof error === 'string') errorStr = error;
      else if (error instanceof Error) errorStr = error.message;
      else if (error && typeof error === 'object') {
        errorStr = (error as any).message || (error as any).error_description || (error as any).msg || JSON.stringify(error, Object.getOwnPropertyNames(error));
      }
      
      let msg = errorStr || 'Error desconocido';

      if (msg.includes('already registered') || msg.includes('already been registered')) {
        msg = 'Este correo ya está registrado. Intenta iniciar sesión.';
      } else if (msg.includes('Password should be')) {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (msg.includes('valid email')) {
        msg = 'El correo ingresado no es válido.';
      } else if (msg.includes('rate limit')) {
        msg = 'Demasiados intentos. Por favor intenta más tarde.';
      } else if (msg === '{}' || msg.startsWith('{')) {
        msg = 'Error del servidor: ' + JSON.stringify(error, Object.getOwnPropertyNames(error));
      }
      
      Swal.fire({ icon: 'error', title: 'Error en el Registro', text: msg, confirmButtonColor: '#B00020' });
      return;
    }

    // Nunca dejar al usuario auto-autenticado tras registrarse: si Supabase devolvió
    // una sesión (porque "Confirm email" está desactivado en el proyecto), ciérrala
    // para forzar la verificación por correo antes de poder ingresar.
    if (data.session) {
      await supabase.auth.signOut();
    }

    // identities vacío => el correo ya estaba registrado (Supabase no lo revela en el error).
    const yaExistia = data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
    if (yaExistia) {
      Swal.fire({
        icon: 'info',
        title: 'Correo ya registrado',
        text: 'Este correo ya tiene una cuenta. Intenta iniciar sesión o revisa tu correo de confirmación.',
        confirmButtonColor: '#B00020',
      }).then(() => setView('login'));
      return;
    }

    Swal.fire({
      icon: 'success',
      title: '¡Registro Exitoso!',
      html: 'Tu cuenta fue creada.<br><b>Revisa tu correo</b> para confirmarla antes de iniciar sesión.',
      confirmButtonColor: '#B00020',
    }).then(() => {
      setView('login');
      setRegisterNombre('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
    });
  };

  return (
    <div 
      className="min-h-screen w-full bg-cover bg-center relative flex items-center justify-center overflow-x-hidden font-sans"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      {/* Superposición */}
      <div className="absolute inset-0 bg-white/40 dark:bg-[#0d1218]/80 backdrop-blur-[4px] transition-colors duration-500"></div>

      {/* Botón Toggle Theme Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-50">
        <button 
          onClick={toggleTheme}
          className="bg-white/90 dark:bg-[#1a1f26]/80 backdrop-blur-md p-3 rounded-full text-gray-800 dark:text-gray-300 shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:shadow-none border border-gray-100 dark:border-gray-700/50 hover:scale-105 transition-all"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Contenedor de Contenido */}
      <div className="relative z-10 w-full max-w-[1200px] px-4 sm:px-8 py-10 sm:py-12 flex flex-col xl:flex-row justify-between items-center min-h-[100vh] xl:min-h-[700px] gap-8 xl:gap-0 mt-8 sm:mt-0">

        {/* ================= COLUMNA IZQUIERDA ================= */}
        <div className="flex flex-col justify-between h-full w-full xl:w-1/2 py-4 items-center xl:items-start text-center xl:text-left">
          
          {/* Logo y Estado */}
          <div className="flex flex-col gap-4 sm:gap-6 items-center xl:items-start">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-espoch-red p-2.5 rounded-xl shadow-[0_4px_15px_rgba(176,0,0,0.4)] flex items-center justify-center">
                <GraduationCap className="text-white w-[45px] h-[45px] sm:w-[54px] sm:h-[54px]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col justify-center text-left">
                <h1 className="text-gray-900 dark:text-white text-4xl sm:text-5xl font-bold tracking-tight leading-none m-0 transition-colors">ESPOCH</h1>
                <span className="text-espoch-red dark:text-espoch-yellow text-[11px] sm:text-[13px] font-bold tracking-[0.2em] mt-1 sm:ml-1 flex items-center gap-1.5 uppercase transition-colors">
                  <Zap className="w-3.5 h-3.5 fill-current" /> ELECTRICIDAD
                </span>
              </div>
            </div>

            {/* Badge Estado en línea */}
            <div className="inline-flex items-center gap-2.5 bg-white/95 dark:bg-[#171b22]/90 border border-gray-200 dark:border-gray-700/60 rounded-full px-3.5 py-1.5 w-max shadow-sm sm:ml-1 transition-colors">
              <div className="w-2.5 h-2.5 rounded-full bg-espoch-yellow shadow-[0_0_8px_rgba(255,193,7,0.8)]"></div>
              <span className="text-[9px] text-gray-700 dark:text-gray-300 font-semibold tracking-[0.1em] uppercase">
                Sistema en línea: Selección de Aulas
              </span>
            </div>
          </div>

          {/* Reloj Central Esférico */}
          <div className="my-8 sm:my-12 xl:ml-4 flex justify-center xl:justify-start">
            <div className="w-[280px] h-[280px] sm:w-[350px] sm:h-[350px] rounded-full border-[16px] sm:border-[20px] border-white/70 bg-[#f4f5f7]/95 shadow-[0_15px_40px_rgba(0,0,0,0.15)] dark:border-[#151921] dark:bg-[#0c1016] dark:shadow-[0_20px_50px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center relative transition-all duration-500 backdrop-blur-md">
              <div className="absolute inset-0 rounded-full shadow-[inset_0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] pointer-events-none transition-shadow duration-500"></div>
              <span className="text-[75px] sm:text-[90px] font-bold text-gray-900 dark:text-white leading-none tracking-tighter mt-4 transition-colors">{timeString}</span>
              <span className="text-espoch-red dark:text-espoch-yellow text-xs sm:text-sm font-semibold tracking-[0.2em] mt-3 transition-colors">{dayString}</span>
              <span className="text-gray-500 text-[10px] sm:text-[11px] font-medium tracking-widest mt-1.5">{dateString}</span>
            </div>
          </div>

          {/* Pie de página izquierdo */}
          <div className="bg-white/90 dark:bg-[#11161d]/80 backdrop-blur-md border border-gray-100 dark:border-gray-800/80 rounded-xl p-4 sm:p-5 w-full max-w-[420px] shadow-lg transition-colors hidden xl:block">
            <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-normal m-0 transition-colors">
              Sistema de gestión y asignación de aulas. Acceso exclusivo para docentes y estudiantes de la Carrera de Electricidad.
            </p>
          </div>
        </div>

        {/* ================= COLUMNA DERECHA (Panel Dinámico) ================= */}
        <div className="w-full max-w-[480px] xl:w-[480px] bg-[#f6f7f9] dark:bg-[#22272e]/80 backdrop-blur-xl border border-white/80 dark:border-gray-500/20 rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] transition-colors duration-500 overflow-hidden mb-8 sm:mb-0">

          {/* Solo se renderiza UN panel a la vez en el DOM */}
          {view === 'login' && (
            <div key="login" className="p-6 sm:p-8 animate-fade-in">
              <div className="text-center sm:text-left">
                <h2 className="text-[24px] sm:text-[28px] font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight transition-colors">Portal Académico</h2>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6 font-normal leading-relaxed transition-colors">
                  Ingrese sus credenciales institucionales para continuar.
                </p>
              </div>

              <div className="w-full h-px bg-gray-200 dark:bg-gray-600/60 mb-6 transition-colors"></div>

              <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <div>
                  <label className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider transition-colors">
                    <span className="text-espoch-red dark:text-espoch-yellow text-lg leading-none mt-[-2px]">&bull;</span> Correo Institucional
                  </label>
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder="Ej. usuario@espoch.edu.ec o admin@espoch.edu.ec" 
                      required
                      value={loginEmail}
                      onChange={(e) => handleEmailChange(e, setLoginEmail, loginEmail)}
                      className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white font-medium text-sm rounded-xl py-3 px-4 outline-none shadow-sm dark:shadow-inner focus:ring-2 focus:ring-espoch-red/50 dark:focus:ring-espoch-yellow/50 border border-gray-200 dark:border-transparent transition-all placeholder:font-normal placeholder:text-gray-400" 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400/80 hover:text-espoch-red transition-colors">
                      <Mail className="w-4 h-4" strokeWidth={2} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider transition-colors">
                    <span className="text-espoch-red dark:text-espoch-yellow text-lg leading-none mt-[-2px]">&bull;</span> Contraseña
                  </label>
                  <div className="relative">
                    <input type={showLoginPassword ? "text" : "password"} placeholder="••••••••••••" required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white font-medium text-lg tracking-widest rounded-xl py-3 px-4 pr-10 outline-none shadow-sm dark:shadow-inner focus:ring-2 focus:ring-espoch-red/50 dark:focus:ring-espoch-yellow/50 border border-gray-200 dark:border-transparent transition-all placeholder:text-gray-400" />
                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400/80 hover:text-espoch-red transition-colors cursor-pointer">
                      {showLoginPassword ? <EyeOff className="w-4 h-4" strokeWidth={2} /> : <Eye className="w-4 h-4" strokeWidth={2} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 mb-1">
                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 transition-colors">Mantener conexión</span>
                  <div 
                    className={`w-[36px] h-[18px] rounded-full flex items-center p-[2px] cursor-pointer transition-colors duration-300 ${keepConnected ? 'bg-[#3a414e]' : 'bg-gray-300'}`} 
                    onClick={() => setKeepConnected(!keepConnected)}
                  >
                    <div className={`w-[14px] h-[14px] rounded-full shadow-sm transition-transform duration-300 ${keepConnected ? 'translate-x-[18px] bg-white' : 'translate-x-0 bg-white'}`}></div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-espoch-red hover:bg-espoch-darkred transition-all text-white font-bold text-[12px] py-3.5 rounded-xl flex items-center justify-center relative shadow-[0_6px_15px_rgba(176,0,0,0.3)] hover:shadow-[0_8px_20px_rgba(176,0,0,0.4)] border-none cursor-pointer">
                  <span>INGRESAR AL SISTEMA</span>
                  <div className="absolute right-5 flex items-center justify-center">
                    <LogIn className="w-[16px] h-[16px] fill-current" stroke="currentColor" />
                  </div>
                </button>

                <div className="flex flex-col sm:flex-row gap-3 mt-1">
                  <button type="button" className="group flex-1 bg-white hover:bg-gray-50 dark:bg-[#1a1f26]/80 dark:hover:bg-[#252b36] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md hover:text-espoch-red dark:hover:text-white py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-gray-600 dark:text-gray-400 tracking-wider shadow-sm border border-gray-200 dark:border-gray-700/30 cursor-pointer">
                    <HelpCircle className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" /> SOPORTE
                  </button>
                  <button type="button" onClick={() => setView('register')} className="group flex-1 bg-white hover:bg-gray-50 dark:bg-[#1a1f26]/80 dark:hover:bg-[#252b36] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md hover:text-espoch-red dark:hover:text-white py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-gray-600 dark:text-gray-400 tracking-wider shadow-sm border border-gray-200 dark:border-gray-700/30 cursor-pointer">
                    <Calendar className="w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110" /> REGISTRATE
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === 'register' && (
            <div key="register" className="p-6 sm:p-8 animate-fade-in">
              <div className="text-center">
                <h2 className="text-[24px] sm:text-[28px] font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight transition-colors">Registro de Usuario</h2>
                <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 mb-4 font-normal transition-colors">
                  Complete sus datos para crear su cuenta.
                </p>
              </div>

              <div className="w-full h-px bg-gray-200 dark:bg-gray-600/60 mb-5 transition-colors"></div>

              <form className="flex flex-col">
                <div className="flex flex-col gap-5 mb-6">
                  <div>
                    <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest mb-3.5 transition-colors">Datos Personales e Institucionales</h3>
                    <div className="flex flex-col gap-3.5">
                      <div>
                        <label className="text-[9px] sm:text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider transition-colors">Nombres Completos</label>
                        <input type="text" placeholder="Ej. Juan Pérez" required value={registerNombre} onChange={(e) => setRegisterNombre(e.target.value)}
                          className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-xs sm:text-sm font-medium rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 transition-all placeholder:font-normal placeholder:text-gray-400" />
                      </div>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-[9px] sm:text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider transition-colors">Código Institucional</label>
                          <input type="text" placeholder="Ej. 123456" required value={registerCodigo} onChange={(e) => setRegisterCodigo(e.target.value)} className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-xs sm:text-sm font-medium rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 transition-all placeholder:font-normal placeholder:text-gray-400" />
                        </div>
                        <div>
                          <label className="text-[9px] sm:text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider transition-colors">Correo Institucional</label>
                          <input type="email" placeholder="Ej. jperez@espoch.edu.ec" required value={registerEmail} onChange={(e) => handleEmailChange(e, setRegisterEmail, registerEmail)}
                            className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-xs sm:text-sm font-medium rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 transition-all placeholder:font-normal placeholder:text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest mb-3.5 transition-colors">Información Académica</h3>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider transition-colors">Facultad</label>
                        <div className="relative">
                          <select required value={registerFacultad} onChange={(e) => { setRegisterFacultad(e.target.value); setRegisterCarrera(''); }} className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-xs sm:text-sm font-medium rounded-xl py-2.5 sm:py-3 pl-3 sm:pl-4 pr-7 sm:pr-8 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 appearance-none transition-all cursor-pointer">
                            <option value="">Seleccione</option>
                            {facultades.map((f) => (
                              <option key={f.id} value={f.id}>{f.siglas || f.nombre}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider transition-colors">Carrera</label>
                        <div className="relative">
                          <select required disabled={!registerFacultad} value={registerCarrera} onChange={(e) => setRegisterCarrera(e.target.value)} className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-xs sm:text-sm font-medium rounded-xl py-2.5 sm:py-3 pl-3 sm:pl-4 pr-7 sm:pr-8 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 appearance-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            <option value="">{registerFacultad ? 'Seleccione' : 'Elija facultad'}</option>
                            {carrerasFiltradas.map((c) => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider transition-colors">PAO</label>
                        <div className="relative">
                          <select required value={registerPao} onChange={(e) => setRegisterPao(e.target.value)} className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-xs sm:text-sm font-medium rounded-xl py-2.5 sm:py-3 pl-3 sm:pl-4 pr-7 sm:pr-8 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 appearance-none transition-all cursor-pointer">
                            <option value="">PAO</option>
                            {PAOS.map(n => <option key={n} value={String(n)}>PAO {n}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest mb-3.5 transition-colors">Credenciales de Cuenta</h3>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="flex flex-col">
                        <label className="text-[9px] sm:text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider transition-colors">Contraseña</label>
                        <div className="relative">
                          <input type={showRegisterPassword ? "text" : "password"} placeholder="••••••••" value={registerPassword} onChange={handlePasswordChange}
                            pattern="(?=.*\d)(?=.*[a-zA-Z]).{8,}" title="Debe contener al menos 8 caracteres, incluyendo letras y números."
                            className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-sm sm:text-base tracking-widest rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 pr-10 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 transition-all placeholder:text-gray-400 placeholder:tracking-normal" />
                          <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-espoch-red transition-colors cursor-pointer">
                            {showRegisterPassword ? <EyeOff className="w-4 h-4" strokeWidth={2} /> : <Eye className="w-4 h-4" strokeWidth={2} />}
                          </button>
                        </div>
                        <div className={`mt-2 flex items-center justify-between gap-2 transition-all duration-300 ${registerPassword.length > 0 ? 'opacity-100 h-2' : 'opacity-0 h-0 overflow-hidden'}`}>
                          <div className="flex gap-1 flex-1 h-1">
                            <div className={`h-full flex-1 rounded-full transition-colors duration-300 ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                            <div className={`h-full flex-1 rounded-full transition-colors duration-300 ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                            <div className={`h-full flex-1 rounded-full transition-colors duration-300 ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                          </div>
                          <span className={`text-[8px] font-extrabold uppercase tracking-wider transition-colors duration-300 ${passwordStrength.score === 1 ? 'text-red-500' : passwordStrength.score === 2 ? 'text-espoch-yellow' : 'text-green-500'}`}>{passwordStrength.text}</span>
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[9px] sm:text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 block uppercase tracking-wider transition-colors">Confirmar</label>
                        <div className="relative">
                          <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={registerConfirmPassword} onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                            className="w-full bg-white dark:bg-[#11161d] text-gray-800 dark:text-white text-sm sm:text-base tracking-widest rounded-xl py-2.5 sm:py-3 px-3 sm:px-4 pr-10 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 transition-all placeholder:text-gray-400 placeholder:tracking-normal" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-espoch-red transition-colors cursor-pointer">
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" strokeWidth={2} /> : <Eye className="w-4 h-4" strokeWidth={2} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-auto">
                  <button type="button" onClick={() => setView('login')} className="group flex-1 bg-white hover:bg-gray-50 dark:bg-[#1a1f26]/80 dark:hover:bg-[#252b36] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-md hover:text-espoch-red py-3 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold text-gray-600 dark:text-gray-300 tracking-wider shadow-sm border border-gray-200 dark:border-gray-700/30 cursor-pointer shrink-0">
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" strokeWidth={2.5} /> VOLVER AL LOGIN
                  </button>
                  <button type="submit" onClick={handleRegister} className="group flex-[1.2] bg-espoch-red hover:bg-espoch-darkred transition-all duration-300 transform hover:-translate-y-1 text-white font-bold tracking-wider text-[10px] py-3 sm:py-3.5 rounded-xl shadow-[0_6px_15px_rgba(176,0,0,0.3)] hover:shadow-[0_8px_20px_rgba(176,0,0,0.4)] border-none cursor-pointer flex items-center justify-center gap-2 shrink-0">
                    <span>REGISTRAR USUARIO</span>
                    <UserPlus className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" strokeWidth={2} />
                  </button>
                </div>
              </form>
            </div>
          )}

          {view === 'mfa' && (
            <div key="mfa" className="p-6 sm:p-8 animate-fade-in">
              <div className="flex flex-col items-center text-center gap-3 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-espoch-red/10 dark:bg-espoch-yellow/10 flex items-center justify-center shadow-inner">
                  <ShieldCheck className="w-8 h-8 text-espoch-red dark:text-espoch-yellow" strokeWidth={1.5} />
                </div>
                <h2 className="text-[22px] sm:text-[26px] font-bold text-gray-900 dark:text-white tracking-tight transition-colors">Verificación en 2 Pasos</h2>
                <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 font-normal leading-relaxed max-w-[300px] transition-colors">
                  Abre tu app de autenticación (Google Authenticator o Authy) e ingresa el código de <strong>6 dígitos</strong>.
                </p>
              </div>

              <div className="w-full h-px bg-gray-200 dark:bg-gray-600/60 mb-6 transition-colors"></div>

              <div className="flex flex-col items-center gap-5">
                <div className="flex gap-2 justify-center">
                  {[0,1,2,3,4,5].map((i) => (
                    <div key={i} className={`w-10 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-all ${
                      mfaCode[i] ? 'border-espoch-red dark:border-espoch-yellow bg-espoch-red/5 dark:bg-espoch-yellow/10 text-gray-900 dark:text-white'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-[#11161d] text-transparent'
                    }`}>
                      {mfaCode[i] || '•'}
                    </div>
                  ))}
                </div>

                <input
                  type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  placeholder="Ingresa el código de 6 dígitos"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && mfaCode.length === 6) handleMfaVerify(); }}
                  className="w-full text-center bg-white dark:bg-[#11161d] text-gray-800 dark:text-white font-bold text-lg tracking-[0.5em] rounded-xl py-3 px-4 outline-none border border-gray-200 dark:border-transparent shadow-sm focus:ring-2 focus:ring-espoch-red/50 dark:focus:ring-espoch-yellow/50 transition-all placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                />

                <button onClick={handleMfaVerify} disabled={mfaLoading || mfaCode.length !== 6}
                  className="w-full bg-espoch-red hover:bg-espoch-darkred disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-bold text-[12px] py-3.5 rounded-xl flex items-center justify-center gap-2.5 shadow-[0_6px_15px_rgba(176,0,0,0.3)] hover:shadow-[0_8px_20px_rgba(176,0,0,0.4)] border-none cursor-pointer"
                >
                  {mfaLoading ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  ) : (
                    <ShieldCheck className="w-4 h-4" strokeWidth={2} />
                  )}
                  VERIFICAR CÓDIGO
                </button>

                <button type="button" onClick={() => { setView('login'); setMfaCode(''); }}
                  className="group flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 hover:text-espoch-red dark:hover:text-espoch-yellow transition-colors cursor-pointer bg-transparent border-none"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-translate-x-1" strokeWidth={2.5} />
                  Volver al inicio de sesión
                </button>
              </div>
            </div>
          )}

        </div>


        {/* Pie de página móvil */}
        <div className="block xl:hidden bg-white/90 dark:bg-[#11161d]/80 backdrop-blur-md border border-gray-100 dark:border-gray-800/80 rounded-xl p-4 w-full max-w-[480px] shadow-lg transition-colors mb-8 text-center">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-relaxed font-normal m-0 transition-colors">
            Sistema de gestión y asignación de aulas. Acceso exclusivo para docentes y estudiantes de la Carrera de Electricidad.
          </p>
        </div>
      </div>
    </div>
  );
};
