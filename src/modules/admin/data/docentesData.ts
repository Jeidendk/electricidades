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
