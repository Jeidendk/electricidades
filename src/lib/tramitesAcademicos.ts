/**
 * Trámites académicos dirigidos al coordinador: estados y transiciones.
 *
 * Es otro recorrido que el de préstamos —documentos, no equipos— y otra tabla
 * (`solicitudes_admin`, con su propio enum `estado_solicitud_admin`). Los dos usan la palabra
 * "solicitud" y ahí termina el parecido.
 *
 * Las mismas reglas están en las funciones de la migración 0045, que son las que mandan. Aquí
 * sirven para no dibujar un botón que el servidor va a rechazar.
 */

/** Etiquetas del enum `estado_solicitud_admin` (migración 0044 añadió las dos primeras). */
export type EstadoTramite =
  | 'borrador'
  | 'cambios_solicitados'
  | 'pendiente'
  | 'aprobado'
  | 'rechazado';

/** Acciones que registra `solicitudes_admin_eventos`. */
export type AccionTramite =
  | 'creada'
  | 'enviada'
  | 'reenviada'
  | 'aprobada'
  | 'rechazada'
  | 'cambios_solicitados';

export const ETIQUETA_ESTADO_TRAMITE: Record<EstadoTramite, string> = {
  borrador: 'Borrador',
  cambios_solicitados: 'Cambios solicitados',
  pendiente: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const ETIQUETA_ACCION_TRAMITE: Record<AccionTramite, string> = {
  creada: 'Creó el borrador',
  enviada: 'Presentó el trámite',
  reenviada: 'Reenvió corregido',
  aprobada: 'Aprobó',
  rechazada: 'Rechazó',
  cambios_solicitados: 'Pidió cambios',
};

/**
 * El estudiante escribe mientras nadie lo esté revisando: su borrador, o lo que el coordinador
 * le devolvió para corregir. Una solicitud presentada no se toca por detrás.
 */
export const puedeEditarloElEstudiante = (estado: string): boolean =>
  estado === 'borrador' || estado === 'cambios_solicitados';

/** Se presenta lo mismo que se puede editar: un borrador nuevo o una corrección. */
export const puedeEnviarse = (estado: string): boolean => puedeEditarloElEstudiante(estado);

/** Solo se decide sobre lo que está esperando decisión. */
export const puedeRevisarse = (estado: string): boolean => estado === 'pendiente';

/**
 * Quién puede decidir: el destinatario del trámite y, como facultad administrativa explícita,
 * el administrador. **Nunca el autor**, aunque sea administrador.
 */
export const puedeRevisarlo = (
  tramite: { id_usuario: string | null; id_destinatario: string | null },
  usuarioId: string | null,
  esAdministrador: boolean,
): boolean => {
  if (!usuarioId) return false;
  if (tramite.id_usuario === usuarioId) return false;
  return tramite.id_destinatario === usuarioId || esAdministrador;
};

/**
 * Hubo reenvío cuando ya se presentó más de una vez. No hace falta un estado aparte: el número
 * de versión lo dice, y un estado duplicado se desincronizaría solo.
 */
export const esReenvio = (version: number): boolean => version > 1;

/** Rechazar o pedir cambios sin decir por qué deja al estudiante sin saber qué corregir. */
export const decisionNecesitaObservaciones = (decision: string): boolean =>
  decision === 'rechazado' || decision === 'cambios_solicitados';

/** Lo que se guarda en cada versión presentada. Reimprimir no debe depender de nada externo. */
export interface DocumentoPresentado {
  /** Plantilla de la que salió, solo como referencia: el texto ya resuelto viaja aquí. */
  idFormato: string | null;
  nombreFormato: string;
  destinatario: { titulo: string; nombre: string; cargo: string };
  /** Valores del formulario, para volver a abrirlo tal cual se presentó. */
  valores: Record<string, string>;
  /** Marcadores de la plantilla transcrita, si la había. */
  marcadores: Record<string, string>;
  contenido: { asunto: string; parrafos: string[]; adjuntos: string[] };
  /** Imagen de firma incorporada, en base64. Null si se presentó para firmar a mano. */
  firmaImagen: string | null;
  encabezadoImagen: string | null;
  pieImagen: string | null;
  numero: string;
  version: number;
  generadoEn: string;
}
