/**
 * Contratos del asistente institucional.
 *
 * Aquí no hay implementación: son las piezas que la pantalla necesita para funcionar y que se
 * reemplazan una a una cuando el motor local exista. Están separadas a propósito —generación,
 * embeddings, almacén vectorial, recuperación y consultas al sistema— porque cada una se va a
 * resolver en un momento distinto y con tecnología distinta.
 *
 * FASE 1: nada de esto habla con un modelo. La única implementación que existe hoy declara que
 * el motor no está configurado (`motorNoConfigurado.ts`), para que la pantalla lo diga en vez
 * de inventar respuestas.
 */

/** Quién escribió un mensaje de la conversación. */
export type AutorMensaje = 'usuario' | 'asistente';

/**
 * De dónde salió lo que afirma una respuesta. Se muestra al usuario, así que distingue lo que
 * viene de un documento de lo que se consultó en el sistema: no tienen la misma autoridad ni
 * envejecen igual.
 */
export type OrigenRespuesta =
  /** Fragmentos recuperados de documentos del repositorio. */
  | 'documentos'
  /** Datos leídos del propio sistema (horarios, espacios, solicitudes). */
  | 'sistema'
  /** No se encontró evidencia suficiente para responder. */
  | 'sin-evidencia'
  /** El motor todavía no está configurado en el servidor. */
  | 'motor-no-configurado'
  /** Falló la consulta; el texto explica qué pasó. */
  | 'error';

/** Un documento citado, con lo necesario para que el usuario lo compruebe por su cuenta. */
export interface ReferenciaDocumental {
  id: string;
  titulo: string;
  /** Categoría documental donde vive, para ubicarlo en el repositorio. */
  categoria?: string;
  /** Versión del documento, cuando el repositorio la registre. */
  version?: string;
  /** Página o sección de la que salió el fragmento, si el extractor la conoce. */
  ubicacion?: string;
  /** El texto exacto que se usó. Sin esto, la cita no se puede verificar. */
  fragmento?: string;
  /** Enlace al documento, ya autorizado para quien pregunta. */
  enlace?: string;
}

/** Una consulta de solo lectura al sistema que respalda parte de la respuesta. */
export interface ReferenciaDatos {
  /** Qué se consultó, en palabras del dominio: "horario del estudiante", "espacios libres". */
  consulta: string;
  /** Cuándo se leyó: un horario respondido ayer puede ya no ser cierto. */
  consultadoEn: string;
  /** Resumen de lo encontrado, para mostrar sin repetir toda la respuesta. */
  resumen: string;
}

/** Lo que el servicio devuelve por cada pregunta. */
export interface RespuestaAsistente {
  texto: string;
  origen: OrigenRespuesta;
  documentos: ReferenciaDocumental[];
  datos: ReferenciaDatos[];
}

export interface MensajeConversacion {
  id: string;
  autor: AutorMensaje;
  texto: string;
  creadoEn: string;
  /** Solo en los mensajes del asistente. */
  respuesta?: RespuestaAsistente;
}

export interface Conversacion {
  id: string;
  titulo: string;
  creadaEn: string;
  mensajes: MensajeConversacion[];
}

/** Estado del motor local, tal como lo reporta el servidor. Nunca se supone: se pregunta. */
export interface EstadoMotor {
  configurado: boolean;
  /** Qué falta o qué falló, en una frase que se pueda mostrar tal cual. */
  detalle: string;
  /** Modelo de generación anunciado por el servidor, si lo hay. */
  modelo?: string;
}

/** Quién pregunta. El servidor vuelve a comprobarlo: esto es solo para armar la pantalla. */
export interface ContextoUsuario {
  rol: 'admin' | 'tecnico' | 'student';
  carreraId?: string;
  pao?: number;
  paralelo?: number;
}

/** Lo que la pantalla necesita del servicio, sea cual sea la implementación que haya detrás. */
export interface ServicioAsistente {
  /** Pregunta al servidor si el motor está listo. Sin respuesta afirmativa, no se consulta. */
  estadoMotor(): Promise<EstadoMotor>;
  /** Responde una pregunta. `senal` permite cancelar desde la interfaz. */
  preguntar(
    pregunta: string,
    contexto: ContextoUsuario,
    senal?: AbortSignal,
  ): Promise<RespuestaAsistente>;
}

// ── Piezas que el servicio compondrá cuando el motor exista ──────────────────────────────

/** Genera texto a partir de un contexto ya recuperado. Lo ejecuta el backend, nunca el navegador. */
export interface ProveedorGeneracion {
  generar(indicacion: string, senal?: AbortSignal): Promise<string>;
}

/** Convierte texto en vectores. Se separa de la generación porque suelen ser modelos distintos. */
export interface ProveedorEmbeddings {
  vectorizar(textos: string[]): Promise<number[][]>;
}

/** Fragmento de documento con su vector, tal como se guarda en el almacén. */
export interface FragmentoIndexado {
  id: string;
  documentoId: string;
  texto: string;
  ubicacion?: string;
  vector: number[];
}

/**
 * Almacén de vectores. Detrás puede estar pgvector en Supabase o un índice en la máquina local;
 * la decisión se toma después y por eso vive tras esta interfaz.
 */
export interface AlmacenVectorial {
  guardar(fragmentos: FragmentoIndexado[]): Promise<void>;
  buscar(vector: number[], limite: number): Promise<FragmentoIndexado[]>;
  eliminarDocumento(documentoId: string): Promise<void>;
}

/** Recupera los fragmentos que responden a una pregunta, ya filtrados por lo que el usuario puede ver. */
export interface RecuperadorDocumentos {
  recuperar(pregunta: string, contexto: ContextoUsuario): Promise<ReferenciaDocumental[]>;
}

/**
 * Consultas de solo lectura al sistema.
 *
 * Son funciones con nombre y no SQL generado por el modelo: una consulta escrita por un modelo
 * no se puede revisar antes de ejecutarse, y aquí cada una tiene su permiso y su forma.
 */
export interface ConsultasSistema {
  horarioDelEstudiante(contexto: ContextoUsuario): Promise<ReferenciaDatos | null>;
  espaciosSinClases(desde: string, hasta: string): Promise<ReferenciaDatos | null>;
  disponibilidadDeEquipos(termino: string): Promise<ReferenciaDatos | null>;
  solicitudesDelUsuario(contexto: ContextoUsuario): Promise<ReferenciaDatos | null>;
}

/** Dónde viven las conversaciones. En fase 1, en memoria: no se persiste nada sin decidir retención. */
export interface AlmacenConversaciones {
  listar(): Promise<Conversacion[]>;
  guardar(conversacion: Conversacion): Promise<void>;
  eliminar(id: string): Promise<void>;
}

// ── Base de conocimiento ────────────────────────────────────────────────────────────────

/**
 * En qué punto está un documento del repositorio respecto al asistente.
 *
 * `indexado` solo puede ponerlo el proceso que de verdad extrajo el texto y guardó los vectores.
 * Marcarlo desde la interfaz haría que la pantalla prometiera algo que no existe.
 */
export type EstadoIndexacion =
  | 'pendiente'
  | 'procesando'
  | 'indexado'
  | 'requiere-ocr'
  | 'error'
  | 'excluido'
  | 'sin-acceso';

export interface DocumentoConocimiento {
  id: string;
  titulo: string;
  categoria: string;
  /** De dónde saldría el texto: una plantilla del sistema o un archivo externo. */
  origen: 'plantilla' | 'enlace' | 'archivo';
  estado: EstadoIndexacion;
  /** Por qué está en ese estado, cuando no es evidente. */
  detalle?: string;
  enlace?: string;
  actualizadoEn?: string;
}
