// Bloqueo de cuenta por intentos fallidos de inicio de sesión.
//
// El estado vive en la base (migración 0018), no en el navegador: limpiar caché o cambiar
// de equipo no evita el bloqueo. Aquí solo se consultan las funciones y se traduce el
// resultado a mensajes para la pantalla de login.

import { supabase } from './supabase';

export interface EstadoBloqueo {
  bloqueado: boolean;
  segundosRestantes: number;
  intentosRestantes: number;
}

const SIN_BLOQUEO: EstadoBloqueo = { bloqueado: false, segundosRestantes: 0, intentosRestantes: 3 };

/** Las RPC devuelven una fila; se normaliza a un objeto plano. */
const aEstado = (fila: any): EstadoBloqueo => ({
  bloqueado: Boolean(fila?.bloqueado),
  segundosRestantes: Number(fila?.segundos_restantes ?? 0),
  intentosRestantes: Number(fila?.intentos_restantes ?? 0),
});

const primeraFila = (data: unknown) => (Array.isArray(data) ? data[0] : data);

/**
 * Estado actual del correo. Si la consulta falla (por ejemplo, la migración todavía no se
 * ejecutó) se devuelve "sin bloqueo" para no dejar a nadie fuera por un problema nuestro.
 */
export const consultarBloqueo = async (correo: string): Promise<EstadoBloqueo> => {
  const { data, error } = await supabase.rpc('estado_bloqueo_login', { p_correo: correo });
  if (error) {
    console.warn('No se pudo consultar el bloqueo de login:', error.message);
    return SIN_BLOQUEO;
  }
  return aEstado(primeraFila(data));
};

/** Suma un intento fallido y devuelve el estado resultante. */
export const registrarIntentoFallido = async (correo: string): Promise<EstadoBloqueo> => {
  const { data, error } = await supabase.rpc('registrar_intento_fallido', { p_correo: correo });
  if (error) {
    console.warn('No se pudo registrar el intento fallido:', error.message);
    return SIN_BLOQUEO;
  }
  return aEstado(primeraFila(data));
};

/** Limpia el contador tras un inicio de sesión correcto. Requiere sesión activa. */
export const limpiarIntentos = async (): Promise<void> => {
  const { error } = await supabase.rpc('limpiar_intentos_login');
  if (error) console.warn('No se pudo limpiar el contador de intentos:', error.message);
};

/** "12 minutos", "45 segundos", "1 hora 5 minutos". */
export const describirEspera = (segundos: number): string => {
  if (segundos <= 60) return `${Math.max(segundos, 1)} segundos`;

  const minutosTotales = Math.ceil(segundos / 60);
  if (minutosTotales < 60) return `${minutosTotales} ${minutosTotales === 1 ? 'minuto' : 'minutos'}`;

  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;
  const textoHoras = `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return minutos === 0 ? textoHoras : `${textoHoras} ${minutos} min`;
};

/** Mensaje para el usuario cuando la cuenta está bloqueada. */
export const mensajeBloqueo = (estado: EstadoBloqueo): string =>
  `Demasiados intentos fallidos. Vuelve a intentarlo en ${describirEspera(estado.segundosRestantes)}. ` +
  'Si olvidaste tu contraseña, usa "¿Olvidaste tu contraseña?" para recuperarla.';

/** Aviso tras un intento fallido que todavía no bloquea. */
export const mensajeIntentosRestantes = (estado: EstadoBloqueo): string =>
  estado.intentosRestantes === 1
    ? 'Te queda 1 intento antes de que la cuenta se bloquee temporalmente.'
    : `Te quedan ${estado.intentosRestantes} intentos antes de que la cuenta se bloquee temporalmente.`;
