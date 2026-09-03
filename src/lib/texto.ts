/**
 * Normaliza texto para comparar: sin tildes, en minúsculas, sin espacios sobrantes.
 * Se usa para cruzar datos escritos a mano (nombres de carrera, aulas, materias) donde
 * "Electrónica y Automatización" y "electronica y automatizacion" son lo mismo.
 */
export const normalizarTexto = (valor: unknown): string =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

/** Mayúsculas con las reglas del español. Los catálogos se guardan así para que la lista se vea pareja. */
export const enMayusculas = (valor: string): string => valor.toLocaleUpperCase('es');

/**
 * Compara dos nombres de día ignorando tildes y mayúsculas: "Miercoles" y "Miércoles"
 * son el mismo día. Los datos vienen de fuentes distintas (formulario, importación de
 * Excel, filas antiguas), así que la igualdad estricta deja clases invisibles.
 */
export const mismoDia = (a: unknown, b: unknown): boolean =>
  normalizarTexto(a) === normalizarTexto(b);

/**
 * Extrae el número de un valor que puede venir como número o como texto ("5", "5to", "PAO 5").
 * Devuelve undefined si no hay ningún dígito: así el llamador distingue "sin dato" de 0.
 */
export const aNumeroOpcional = (valor: unknown): number | undefined => {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : undefined;

  const digitos = String(valor ?? '').match(/\d+/);
  return digitos ? Number(digitos[0]) : undefined;
};
