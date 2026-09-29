/**
 * Qué documentos del repositorio podría usar el asistente, y en qué punto está cada uno.
 *
 * Esto NO indexa nada: describe la situación real de cada documento para que la pantalla de
 * administración la muestre sin prometer lo que todavía no ocurre. El estado `indexado` solo
 * puede escribirlo el proceso que extraiga el texto y guarde los vectores.
 */
import type { DocumentoConocimiento, EstadoIndexacion } from './tipos.ts';

/** Dominios de almacenamiento externo cuyo contenido el sistema no puede leer por su cuenta. */
const DOMINIOS_EXTERNOS = ['docs.google.com', 'drive.google.com', 'sharepoint.com', 'onedrive.live.com', '1drv.ms'];

/** Extensiones cuyo texto se puede extraer sin OCR. Un PDF escaneado no entra aquí. */
const EXTENSIONES_CON_TEXTO = ['txt', 'md', 'docx', 'pdf'];

const MOTIVO_ENLACE_EXTERNO =
  'El documento vive fuera del sistema y su contenido no se puede leer sin una autorización '
  + 'propia contra ese servicio. Un enlace no es contenido accesible.';

const MOTIVO_SIN_MOTOR = 'Se indexará cuando el motor de embeddings esté configurado.';

const esEnlaceExterno = (enlace: string) => {
  try {
    const dominio = new URL(enlace).hostname.toLowerCase();
    return DOMINIOS_EXTERNOS.some(externo => dominio === externo || dominio.endsWith(`.${externo}`));
  } catch {
    return false;
  }
};

const extensionDe = (nombre: string) => nombre.split('.').pop()?.toLowerCase() ?? '';

/** La fila de `formatos` tal como la lee esta pantalla. Se define aquí para no depender del store. */
export interface FilaFormato {
  id: string;
  nombre: string;
  tipo: string;
  enlace?: string | null;
  archivo_nombre?: string | null;
  datos?: unknown;
  updated_at?: string | null;
}

/**
 * Clasifica un documento del repositorio.
 *
 * Tres orígenes, tres situaciones distintas:
 * - Plantilla: su texto ya está en el sistema, así que solo espera al motor.
 * - Archivo subido: hay bytes que extraer; si no es un formato con texto, hará falta OCR.
 * - Enlace externo: no hay contenido al que llegar, y decirlo es parte de la respuesta.
 */
export const clasificarDocumento = (
  fila: FilaFormato,
  excluidos: ReadonlySet<string>,
  categoria: string,
): DocumentoConocimiento => {
  const base = {
    id: fila.id,
    titulo: fila.nombre,
    categoria,
    enlace: fila.enlace ?? undefined,
    actualizadoEn: fila.updated_at ?? undefined,
  };

  if (excluidos.has(fila.id)) {
    return {
      ...base,
      origen: fila.tipo === 'DINAMICO' ? 'plantilla' : fila.enlace ? 'enlace' : 'archivo',
      estado: 'excluido',
      detalle: 'Excluido del asistente. Sigue disponible en el repositorio.',
    };
  }

  const tienePlantilla = !!(fila.datos as { plantilla?: unknown } | null)?.plantilla;
  if (tienePlantilla) {
    return { ...base, origen: 'plantilla', estado: 'pendiente', detalle: MOTIVO_SIN_MOTOR };
  }

  if (fila.archivo_nombre) {
    const extension = extensionDe(fila.archivo_nombre);
    const estado: EstadoIndexacion = EXTENSIONES_CON_TEXTO.includes(extension) ? 'pendiente' : 'requiere-ocr';
    return {
      ...base,
      origen: 'archivo',
      estado,
      detalle: estado === 'pendiente' ? MOTIVO_SIN_MOTOR : `No se puede extraer texto de un archivo .${extension} sin OCR.`,
    };
  }

  if (fila.enlace && esEnlaceExterno(fila.enlace)) {
    return { ...base, origen: 'enlace', estado: 'sin-acceso', detalle: MOTIVO_ENLACE_EXTERNO };
  }

  return {
    ...base,
    origen: fila.enlace ? 'enlace' : 'archivo',
    estado: 'sin-acceso',
    detalle: 'No hay contenido que leer: el documento no tiene archivo ni texto en el sistema.',
  };
};

/** Cuántos documentos hay en cada estado, para el resumen de la pantalla. */
export const contarPorEstado = (documentos: DocumentoConocimiento[]): Record<EstadoIndexacion, number> => {
  const conteo = {
    pendiente: 0,
    procesando: 0,
    indexado: 0,
    'requiere-ocr': 0,
    error: 0,
    excluido: 0,
    'sin-acceso': 0,
  } as Record<EstadoIndexacion, number>;
  for (const documento of documentos) conteo[documento.estado] += 1;
  return conteo;
};

/** Texto que ve el usuario para cada estado. */
export const ETIQUETA_ESTADO: Record<EstadoIndexacion, string> = {
  pendiente: 'Pendiente',
  procesando: 'Procesando',
  indexado: 'Indexado',
  'requiere-ocr': 'Requiere OCR',
  error: 'Error',
  excluido: 'Excluido',
  'sin-acceso': 'Sin acceso',
};
