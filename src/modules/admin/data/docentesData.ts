/**
 * Títulos académicos que ofrece el formulario de docentes.
 * Se guarda la abreviatura tal cual, que es lo que sale impreso en el horario.
 * Agregar uno nuevo es añadirlo a esta lista: no hay nada más que tocar.
 */
export const TITULOS_ACADEMICOS = ['Ing.', 'Lic.', 'Mgs.', 'MSc.', 'PhD.', 'Dr.', 'Dra.'];

/**
 * "ING. DIEGO VELOZ". Sin título devuelve solo el nombre, sin espacio suelto adelante.
 * Las mayúsculas las pone el CSS de cada vista; aquí solo se arma el texto.
 */
export const nombreConTitulo = (
  titulo: string | null | undefined,
  nombre: string | null | undefined,
): string => [titulo?.trim(), nombre?.trim()].filter(Boolean).join(' ');

/**
 * Nombre completo canónico a partir de los dos campos que se capturan.
 * El orden es siempre NOMBRES + APELLIDOS: tener dos inputs rotulados es justamente lo que
 * evita que cada persona lo escriba al revés.
 */
export const componerNombreCompleto = (nombres: string, apellidos: string): string =>
  `${nombres.trim()} ${apellidos.trim()}`.trim().replace(/\s+/g, ' ');

/** Los nombres de docente se guardan en mayúsculas para que la lista se vea pareja. */
export const enMayusculas = (valor: string): string => valor.toLocaleUpperCase('es');
