/**
 * Recuperación cuando la pestaña abierta quedó apuntando a una versión vieja del sistema.
 *
 * Vite parte la app en trozos con un hash en el nombre (`AdminLayout-B11TMm2M.js`). Al
 * desplegar una versión nueva esos archivos dejan de existir, pero una pestaña que lleva rato
 * abierta —o un `index.html` cacheado— sigue pidiendo los nombres viejos y el navegador
 * responde 404. React lo reporta como "Failed to fetch dynamically imported module".
 *
 * No es un error del código: es que el usuario tiene media app de ayer y media de hoy. La
 * única salida es recargar para tomar el `index.html` nuevo.
 */

/** Marca en la pestaña que ya se recargó, para no entrar en un ciclo de recargas. */
const CLAVE_RECARGA = 'espoch:recarga-por-despliegue';

/** sessionStorage puede lanzar (modo privado, cookies bloqueadas); nunca debe tumbar la app. */
const leerMarca = (): boolean => {
  try {
    return sessionStorage.getItem(CLAVE_RECARGA) === '1';
  } catch {
    return false;
  }
};

const escribirMarca = () => {
  try {
    sessionStorage.setItem(CLAVE_RECARGA, '1');
  } catch {
    /* Sin almacenamiento no hay protección contra el ciclo, pero tampoco se rompe nada. */
  }
};

/** Se llama tras una carga correcta: la próxima versión nueva podrá recargar otra vez. */
export const olvidarRecarga = () => {
  try {
    sessionStorage.removeItem(CLAVE_RECARGA);
  } catch {
    /* Ignorado a propósito. */
  }
};

/**
 * Cierto solo para los fallos de carga de un módulo. Cada navegador redacta el mensaje a su
 * manera, así que se comparan varias formas en vez de una sola.
 */
export const esErrorDeVersionVieja = (error: unknown): boolean => {
  const mensaje = String((error as Error)?.message ?? error ?? '');
  return (
    /failed to fetch dynamically imported module/i.test(mensaje) ||
    /error loading dynamically imported module/i.test(mensaje) ||
    /importing a module script failed/i.test(mensaje) ||
    /unable to preload css/i.test(mensaje)
  );
};

/**
 * Recarga la pestaña, pero **una sola vez**. Si tras recargar el fallo persiste, el problema es
 * otro (el servidor caído, por ejemplo) y conviene que se vea en lugar de recargar sin parar.
 *
 * Devuelve `false` si ya se había recargado antes, para que quien llama muestre el error.
 */
export const recargarUnaVez = (): boolean => {
  if (leerMarca()) return false;
  escribirMarca();
  window.location.reload();
  return true;
};
