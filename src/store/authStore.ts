import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export type Rol = 'admin' | 'tecnico' | 'student';

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;       // etiqueta visible (Administrador / Técnico / Estudiante)
  avatar: string | null;
  role: Rol;         // rol funcional para routing/permisos
  tecnicoId?: string;
  facultadNombre?: string;
  carreraId?: string;     // carrera del estudiante (de metadata de registro) → horario automático
  carreraNombre?: string; // carrera asignada al estudiante o técnico
  pao?: number;           // PAO/periodo del estudiante
}

export type LoginResult =
  | { success: true; message: string }
  | { success: false; message: string; requiresMfa?: false }
  | { success: false; requiresMfa: true; factorId: string };

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  setUser: (u: AuthUser | null) => void;
  logout: () => Promise<void>;
  login: (email: string, pass: string) => Promise<LoginResult>;
  verifyMfa: (factorId: string, code: string) => Promise<{ success: boolean; message: string }>;
  initAuth: () => () => void; // retorna el unsubscribe del listener
}

/**
 * Actualiza la propia fila de public.usuarios al iniciar sesión:
 *  - ultima_conexion (siempre; la columna ya existe)
 *  - datos del registro guardados en la metadata de Auth (código, facultad, carrera, PAO)
 *    → sólo se aplican si esas columnas existen; si aún no se corrió la migración, falla en silencio.
 * RLS permite el self-update porque el usuario está autenticado como sí mismo.
 */
async function syncPerfilOnLogin(userId: string): Promise<void> {
  // La fila pública es la fuente principal. La metadata sólo completa datos
  // todavía vacíos durante el primer acceso; nunca reemplaza una edición administrativa.
  const { data: perfilActual } = await supabase
    .from('usuarios')
    .select('codigo_institucional, facultad_nombre, carrera_nombre, departamento, pao')
    .eq('id', userId)
    .maybeSingle();

  const { data: authData } = await supabase.auth.getUser();
  const meta = (authData?.user?.user_metadata ?? {}) as Record<string, any>;
  const patch: Record<string, any> = {
    ultima_conexion: new Date().toISOString(),
  };
  if (!perfilActual?.codigo_institucional && meta.codigo_institucional) {
    patch.codigo_institucional = meta.codigo_institucional;
  }
  if (!perfilActual?.facultad_nombre && meta.facultad_nombre) {
    patch.facultad_nombre = meta.facultad_nombre;
  }
  if (!perfilActual?.carrera_nombre && meta.carrera_nombre) {
    patch.carrera_nombre = meta.carrera_nombre;
  }
  if (!perfilActual?.departamento && meta.departamento) {
    patch.departamento = meta.departamento;
  }
  if (
    (perfilActual?.pao == null || perfilActual.pao === '') &&
    meta.pao != null &&
    meta.pao !== ''
  ) {
    patch.pao = String(meta.pao);
  }
  await supabase.from('usuarios').update(patch).eq('id', userId);
}

/** Dado el id del usuario autenticado, carga su perfil de public.usuarios */
async function fetchPerfil(userId: string): Promise<AuthUser | null> {
  // 1. Cargar perfil del usuario (sin join para no depender de RLS de roles)
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, avatar_url, id_rol, facultad_nombre, carrera_nombre, pao')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[AuthStore] Error al cargar perfil:', error.message, '| code:', error.code);
    // Fallback: usar datos de auth.users si RLS bloquea la consulta
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const meta = authData.user.user_metadata as { nombre?: string } | undefined;
      console.warn('[AuthStore] Usando fallback de auth.users. Verifica las políticas RLS de public.usuarios.');
      return {
        id: authData.user.id,
        nombre: meta?.nombre || authData.user.email?.split('@')[0] || 'Usuario',
        email: authData.user.email || '',
        rol: 'Estudiante',
        avatar: null,
        role: 'student',
      };
    }
    return null;
  }

  if (!data) return null;

  // 2. Cargar el rol por separado
  let rolFuncional: Rol = 'student';
  let rolVisible = 'Estudiante';

  const { data: rolData } = await supabase
    .from('roles')
    .select('nombre')
    .eq('id', data.id_rol)
    .single();

  if (rolData) {
    const nombreRol = rolData.nombre.toLowerCase();
    if (nombreRol.includes('admin')) {
      rolFuncional = 'admin';
      rolVisible = 'Administrador';
    } else if (nombreRol.includes('tecnico') || nombreRol.includes('técnico')) {
      rolFuncional = 'tecnico';
      rolVisible = 'Técnico';
    }
  }

  const { data: authData } = await supabase.auth.getUser();
  const meta = (authData?.user?.user_metadata ?? {}) as {
    carrera_id?: string;
    carrera_nombre?: string;
    facultad_nombre?: string;
    pao?: string | number;
  };

  // Asignación académica del estudiante o técnico.
  let carreraId: string | undefined;
  const carreraNombre = data.carrera_nombre || meta.carrera_nombre || undefined;
  const facultadNombre = data.facultad_nombre || meta.facultad_nombre || undefined;
  let pao: number | undefined;
  if (rolFuncional === 'student') {
    if (carreraNombre) {
      const { data: carreraData } = await supabase
        .from('carreras')
        .select('id')
        .eq('nombre', carreraNombre)
        .limit(1)
        .maybeSingle();
      carreraId = carreraData?.id || meta.carrera_id || undefined;
    } else {
      carreraId = meta.carrera_id || undefined;
    }
    const paoPerfil = data.pao != null && data.pao !== '' ? data.pao : meta.pao;
    pao = paoPerfil != null && paoPerfil !== '' ? Number(paoPerfil) : undefined;
  }

  return {
    id: data.id,
    nombre: data.nombre,
    email: data.email || '',
    rol: rolVisible,
    avatar: data.avatar_url,
    role: rolFuncional,
    ...(rolFuncional === 'tecnico' ? { tecnicoId: data.id } : {}),
    ...(facultadNombre ? { facultadNombre } : {}),
    ...(carreraId ? { carreraId } : {}),
    ...(carreraNombre ? { carreraNombre } : {}),
    ...(pao != null ? { pao } : {}),
  };
}


// Flag para bloquear el auto-login cuando MFA está pendiente
let _mfaPending = false;

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  loading: true,

  setUser: (u) => set({ user: u }),

  /** Inicia sesión con Supabase Auth y luego carga el perfil de public.usuarios */
  login: async (email: string, pass: string): Promise<LoginResult> => {
    // ── Activar la bandera ANTES de llamar a Supabase ─────────────────────
    // El evento SIGNED_IN del listener se dispara DURANTE signInWithPassword.
    // Si la activamos aquí, el listener la encuentra y no navega prematuramente.
    _mfaPending = true;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error || !data.session) {
      _mfaPending = false; // limpiar si falló el login
      let msg = 'Error al iniciar sesión';
      if (error?.message.includes('Invalid login credentials')) {
        msg = 'Correo o contraseña incorrectos.';
      } else if (error?.message.includes('Email not confirmed')) {
        msg = 'Debes confirmar tu correo antes de ingresar.';
      } else if (error?.message) {
        msg = error.message;
      }
      return { success: false, message: msg };
    }

    // ── Verificar si el usuario tiene MFA activo ──────────────────────────
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const totpFactor = factorsData?.totp?.find(f => f.status === 'verified');

    if (totpFactor) {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
        // MFA requerido → dejar _mfaPending = true y pedir código
        return { success: false, requiresMfa: true, factorId: totpFactor.id };
      }
    }

    // ── Sin MFA: limpiar bandera y cargar perfil normalmente ──────────────
    _mfaPending = false;
    const perfil = await fetchPerfil(data.session.user.id);
    if (!perfil) {
      await supabase.auth.signOut();
      return {
        success: false,
        message: 'No se pudo cargar el perfil de usuario. Intenta nuevamente.',
      };
    }

    set({ user: perfil, session: data.session });
    syncPerfilOnLogin(data.session.user.id);
    return { success: true, message: 'Login exitoso' };
  },

  /** Verifica el código TOTP de MFA y completa la sesión */
  verifyMfa: async (factorId: string, code: string) => {
    // 1. Crear el desafío
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      return { success: false, message: challengeError?.message || 'Error al crear el desafío MFA.' };
    }

    // 2. Verificar el código ingresado por el usuario
    const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code: code.trim(),
    });

    if (verifyError || !verifyData) {
      let msg = 'Código incorrecto. Intenta nuevamente.';
      if (verifyError?.message.includes('expired')) msg = 'El código ha expirado. Ingresa uno nuevo.';
      return { success: false, message: msg };
    }

    // 3. Sesión ahora está en aal2 — desbloquear y cargar perfil
    _mfaPending = false;
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      const perfil = await fetchPerfil(sessionData.session.user.id);
      if (perfil) { set({ user: perfil, session: sessionData.session }); syncPerfilOnLogin(sessionData.session.user.id); }
    }

    return { success: true, message: 'MFA verificado correctamente.' };
  },

  /** Cierra sesión en Supabase Auth y limpia el estado local */
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  /**
   * Inicializa el listener de sesión de Supabase Auth.
   * Debe llamarse una única vez al arrancar la aplicación.
   * Retorna la función de cleanup para cancelar el listener.
   */
  initAuth: () => {
    // Verificar si hay una sesión activa al arrancar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const perfil = await fetchPerfil(session.user.id);
        set({ user: perfil, session, loading: false });
        // Registrar la conexión también al restaurar sesión (con "Mantener conexión"
        // casi nunca hay un login fresco, por eso antes quedaba en "Sin registro").
        syncPerfilOnLogin(session.user.id);
      } else {
        set({ loading: false });
      }
    });

    // Escuchar cambios de sesión (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Si el MFA está pendiente, no cargar el perfil ni navegar
          // El flujo de verificación MFA se encarga de esto
          if (_mfaPending) return;
          const perfil = await fetchPerfil(session.user.id);
          set({ user: perfil, session, loading: false });
          syncPerfilOnLogin(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, session: null, loading: false });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          set({ session });
        }
      }
    );

    return () => subscription.unsubscribe();
  },
}));
