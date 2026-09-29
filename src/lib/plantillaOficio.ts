/**
 * Plantillas de oficio transcritas del repositorio de la Carrera de Electricidad.
 *
 * Un formato `DINAMICO` puede guardar en `datos.plantilla` la transcripción literal de un
 * oficio institucional. A diferencia del generador escrito a mano —que arma un único párrafo
 * con una frase fija—, aquí el texto es el del documento original y lo que se completa son sus
 * marcadores entre corchetes: `[NÚMERO DE CÉDULA]`, `[FECHA DE INICIO]`…
 *
 * Los marcadores se leen del propio texto en vez de declararse aparte: así una plantilla nueva
 * no necesita que nadie mantenga una lista de campos al día, y el formulario nunca puede
 * quedar desfasado del documento que imprime.
 */
import { normalizarTexto } from './texto.ts';

export interface PlantillaOficio {
  /** Línea "Asunto:" del oficio. */
  asunto: string;
  /** Destinatario tal como está escrito: tratamiento, nombre y cargo, en las líneas del original. */
  destinatario: string[];
  /** Párrafos del cuerpo, con sus marcadores sin rellenar. */
  parrafos: string[];
  /** Lista de "Documentos adjuntos"; vacía si el oficio no pide ninguno. */
  adjuntos: string[];
  /** Nota de norma y plazo que trae el documento al pie. */
  referencia: string;
  /** El original incluye una tabla que el generador todavía no dibuja. */
  tieneTabla: boolean;
  /** Documento de Google del que se transcribió, para volver a compararlo. */
  docId?: string;
}

/** Reconoce una plantilla transcrita dentro de `formatos.datos`, que es JSON libre. */
export const plantillaDe = (datos: unknown): PlantillaOficio | null => {
  const posible = (datos as { plantilla?: Partial<PlantillaOficio> } | null)?.plantilla;
  if (!posible || !Array.isArray(posible.parrafos) || posible.parrafos.length === 0) return null;
  return {
    asunto: posible.asunto || '',
    destinatario: posible.destinatario ?? [],
    parrafos: posible.parrafos,
    adjuntos: posible.adjuntos ?? [],
    referencia: posible.referencia || '',
    tieneTabla: !!posible.tieneTabla,
    docId: posible.docId,
  };
};

/** Un hueco por rellenar. El documento los escribe entre corchetes. */
const MARCADOR = /\[[^\]\n]+\]/g;

/** Los marcadores del documento, sin repetir y en el orden en que aparecen. */
export const marcadoresDe = (plantilla: PlantillaOficio): string[] => {
  const texto = [plantilla.asunto, ...plantilla.parrafos, ...plantilla.adjuntos].join('\n');
  return [...new Set(texto.match(MARCADOR) ?? [])];
};

/** Sustituye los marcadores por lo escrito. Lo que no se completó se deja como está. */
export const rellenarMarcadores = (texto: string, valores: Record<string, string>): string =>
  texto.replace(MARCADOR, marcador => valores[marcador]?.trim() || marcador);

/**
 * Datos del estudiante que el sistema ya conoce. La cédula NO está: `usuarios` no la guarda,
 * y rellenarla con el código institucional pondría un número equivocado en un documento oficial.
 */
export interface PerfilParaOficio {
  nombreCompleto?: string;
  codigoInstitucional?: string;
  carrera?: string;
  facultad?: string;
  pao?: number;
}

/** Qué dato del perfil corresponde a cada marcador, por lo que el marcador dice. */
const CORRESPONDENCIAS: { coincide: (texto: string) => boolean; valor: (p: PerfilParaOficio) => string | undefined }[] = [
  { coincide: t => t.includes('nombres y apellidos') || t === 'nombres', valor: p => p.nombreCompleto },
  { coincide: t => t.includes('codigo estudiantil') || t === 'codigo', valor: p => p.codigoInstitucional },
  { coincide: t => t.includes('pao') || t.includes('nivel'), valor: p => (p.pao != null ? `PAO ${p.pao}` : undefined) },
  { coincide: t => t.includes('carrera'), valor: p => p.carrera },
  { coincide: t => t.includes('facultad'), valor: p => p.facultad },
];

/** Prellena los marcadores que el sistema puede responder solo; el resto quedan vacíos. */
export const prellenarDesdePerfil = (
  marcadores: string[],
  perfil: PerfilParaOficio,
): Record<string, string> => {
  const valores: Record<string, string> = {};
  for (const marcador of marcadores) {
    const texto = normalizarTexto(marcador.slice(1, -1));
    const valor = CORRESPONDENCIAS.find(c => c.coincide(texto))?.valor(perfil);
    valores[marcador] = valor ?? '';
  }
  return valores;
};

/**
 * Reparte las líneas del destinatario en los tres campos del documento.
 * Dos líneas son nombre y cargo; tres, tratamiento, nombre y cargo. Con una sola, esa línea es
 * el cargo: los oficios dirigidos a un órgano ("MIEMBROS DE LA COMISIÓN…") no llevan nombre.
 */
export const destinatarioDe = (lineas: string[]) => {
  const utiles = lineas.map(l => l.trim()).filter(Boolean);
  if (utiles.length >= 3) return { titulo: utiles[0], nombre: utiles[1], cargo: utiles.slice(2).join(' ') };
  if (utiles.length === 2) return { titulo: '', nombre: utiles[0], cargo: utiles[1] };
  return { titulo: '', nombre: '', cargo: utiles[0] ?? '' };
};
