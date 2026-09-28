import { supabase } from './supabase';

/**
 * Archivos de la pantalla Formatos.
 *
 * No se usa `uploadImage` de `lib/upload.ts` a propósito: aquella convierte a WebP y sube al
 * bucket **público** `imagenes`, devolviendo una URL eterna que quien la copie abre para
 * siempre. Estos son documentos institucionales, así que van a un bucket **privado** y se
 * sirven con enlaces firmados que caducan.
 */
const BUCKET = 'formatos';

/** Vida del enlace de descarga. Lo justo para que el navegador arranque la bajada. */
const SEGUNDOS_ENLACE_FIRMADO = 60;

/** Tope por archivo. Un formato es un documento, no un video: si pesa más, algo va mal. */
export const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024;

export interface ArchivoSubido {
  path: string;
  nombre: string;
  tamanoBytes: number;
  tipoMime: string;
}

/** "1.2 MB", "860 KB". Con `null` devuelve un guion: es lo que se ve en la tabla. */
export const formatearTamano = (bytes: number | null | undefined): string => {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

/** Extensión en mayúsculas para la etiqueta de tipo: PDF, DOCX, XLSX… */
export const extensionDe = (nombreArchivo: string | null | undefined): string => {
  const partes = (nombreArchivo || '').split('.');
  return partes.length > 1 ? partes.pop()!.toUpperCase() : 'ARCHIVO';
};

/**
 * Sube el archivo y devuelve lo que hay que guardar en la fila de `formatos`.
 *
 * El nombre dentro del bucket se genera; el original viaja aparte en `archivo_nombre`. Así dos
 * personas pueden subir `SILABO.pdf` sin pisarse, y el usuario sigue viendo su nombre.
 */
export const subirArchivoFormato = async (
  archivo: File,
  serie = 'sin-serie',
): Promise<ArchivoSubido> => {
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    throw new Error(
      `El archivo pesa ${formatearTamano(archivo.size)} y el máximo son ${formatearTamano(TAMANO_MAXIMO_BYTES)}.`,
    );
  }

  const extension = archivo.name.includes('.') ? `.${archivo.name.split('.').pop()}` : '';
  const path = `${serie}/${crypto.randomUUID()}${extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, archivo, {
    upsert: false,
    contentType: archivo.type || 'application/octet-stream',
  });
  if (error) throw error;

  return {
    path,
    nombre: archivo.name,
    tamanoBytes: archivo.size,
    tipoMime: archivo.type || 'application/octet-stream',
  };
};

/** Enlace temporal de descarga. El bucket es privado: sin esto no hay forma de abrirlo. */
export const urlDescargaFormato = async (path: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SEGUNDOS_ENLACE_FIRMADO, { download: true });
  if (error || !data) throw error || new Error('No se pudo preparar la descarga.');
  return data.signedUrl;
};

/**
 * Borra el archivo del bucket.
 *
 * Se llama DESPUÉS de borrar la fila: si fallara el borrado de la fila, quedaría apuntando a
 * un archivo inexistente. Al revés, lo peor que queda es un archivo huérfano ocupando espacio.
 */
export const borrarArchivoFormato = async (path: string): Promise<void> => {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) console.error('No se pudo borrar el archivo del formato:', error);
};
