/**
 * Trámites académicos: los del estudiante y los que el coordinador tiene que revisar.
 *
 * Ninguna operación escribe estados desde el navegador. Guardar, presentar y revisar son las
 * funciones de la migración 0045, que validan permisos y transiciones en el servidor y se
 * ejecutan enteras o no se ejecutan.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { componerNombreCompleto } from '../lib/texto';
import type { AccionTramite, DocumentoPresentado, EstadoTramite } from '../lib/tramitesAcademicos';

export interface Tramite {
  id: number;
  numero: string;
  asunto: string;
  tipo: string;
  estado: EstadoTramite;
  fecha: string;
  descripcion: string | null;
  version: number;
  idUsuario: string | null;
  estudiante: string;
  carrera: string | null;
  idDestinatario: string | null;
  destinatario: string | null;
  idFormato: string | null;
  /** Documento en edición. Solo lo tiene el autor mientras sea borrador o corrección. */
  borrador: DocumentoPresentado | null;
  observaciones: string | null;
  enviadaEn: string | null;
  decididaEn: string | null;
  decididoPor: string | null;
}

export interface VersionTramite {
  id: number;
  version: number;
  documento: DocumentoPresentado;
  creadaEn: string;
}

export interface EventoTramite {
  id: number;
  accion: AccionTramite;
  actor: string | null;
  observaciones: string | null;
  creadoEn: string;
}

interface EstadoStore {
  tramites: Tramite[];
  loading: boolean;
  error: string | null;
  /** Id del trámite con una operación en curso; bloquea el segundo clic. */
  procesando: number | null;
  /** Con qué ámbito se cargó la lista, para recargar igual tras cada operación. */
  filtroUsuario: string | null;

  /** Sin `usuarioId` trae lo que las políticas permitan ver (bandeja del coordinador). */
  fetchTramites: (usuarioId?: string) => Promise<void>;
  cargarHistorial: (id: number) => Promise<{ versiones: VersionTramite[]; eventos: EventoTramite[] }>;

  guardarBorrador: (datos: {
    id?: number | null;
    asunto: string;
    tipo: string;
    idDestinatario: string | null;
    idFormato: string | null;
    documento: DocumentoPresentado;
    descripcion?: string | null;
  }) => Promise<Tramite>;
  enviar: (id: number, documento: DocumentoPresentado) => Promise<boolean>;
  /** Depuración de la bandeja. Solo el administrador, según la política de la 0045. */
  eliminar: (id: number) => Promise<void>;
  revisar: (id: number, decision: 'aprobado' | 'rechazado' | 'cambios_solicitados', observaciones?: string) => Promise<boolean>;
}

const CAMPOS = `
  *,
  autor:id_usuario (nombre, apellido, carrera_nombre),
  destino:id_destinatario (nombre, apellido),
  revisor:decidido_por (nombre, apellido)
`;

const mapear = (fila: any): Tramite => ({
  id: fila.id,
  numero: fila.numero,
  asunto: fila.asunto,
  tipo: fila.tipo,
  estado: fila.estado,
  fecha: fila.fecha,
  descripcion: fila.descripcion ?? null,
  version: fila.version ?? 0,
  idUsuario: fila.id_usuario ?? null,
  estudiante: componerNombreCompleto(fila.autor?.nombre, fila.autor?.apellido) || 'Estudiante',
  carrera: fila.autor?.carrera_nombre ?? null,
  idDestinatario: fila.id_destinatario ?? null,
  destinatario: fila.destino ? componerNombreCompleto(fila.destino.nombre, fila.destino.apellido) : null,
  idFormato: fila.id_formato ?? null,
  borrador: (fila.borrador as DocumentoPresentado) ?? null,
  observaciones: fila.observaciones ?? null,
  enviadaEn: fila.enviada_en ?? null,
  decididaEn: fila.decidida_en ?? null,
  decididoPor: fila.revisor ? componerNombreCompleto(fila.revisor.nombre, fila.revisor.apellido) : null,
});

export const useTramitesStore = create<EstadoStore>()((set, get) => ({
  tramites: [],
  loading: false,
  error: null,
  procesando: null,
  filtroUsuario: null,

  fetchTramites: async (usuarioId) => {
    set({ loading: true, error: null, filtroUsuario: usuarioId ?? null });
    try {
      let consulta = supabase.from('solicitudes_admin').select(CAMPOS).order('created_at', { ascending: false });
      if (usuarioId) consulta = consulta.eq('id_usuario', usuarioId);
      const { data, error } = await consulta;
      if (error) throw error;
      set({ tramites: (data as any[] || []).map(mapear) });
    } catch (err: any) {
      // La lista no se vacía: "no tienes trámites" cuando en realidad falló la consulta es peor
      // que no decir nada.
      set({ error: err?.message || 'No se pudieron cargar los trámites.' });
    } finally {
      set({ loading: false });
    }
  },

  cargarHistorial: async (id) => {
    const [versionesResultado, eventosResultado] = await Promise.all([
      supabase
        .from('solicitudes_admin_versiones')
        .select('id, version, documento, creada_en')
        .eq('id_solicitud', id)
        .order('version', { ascending: false }),
      supabase
        .from('solicitudes_admin_eventos')
        .select('id, accion, observaciones, creado_en, autor:actor (nombre, apellido)')
        .eq('id_solicitud', id)
        .order('creado_en', { ascending: true }),
    ]);

    if (versionesResultado.error) throw versionesResultado.error;
    if (eventosResultado.error) throw eventosResultado.error;

    return {
      versiones: (versionesResultado.data as any[] || []).map(fila => ({
        id: fila.id,
        version: fila.version,
        documento: fila.documento as DocumentoPresentado,
        creadaEn: fila.creada_en,
      })),
      eventos: (eventosResultado.data as any[] || []).map(fila => ({
        id: fila.id,
        accion: fila.accion,
        actor: fila.autor ? componerNombreCompleto(fila.autor.nombre, fila.autor.apellido) : null,
        observaciones: fila.observaciones ?? null,
        creadoEn: fila.creado_en,
      })),
    };
  },

  guardarBorrador: async ({ id, asunto, tipo, idDestinatario, idFormato, documento, descripcion }) => {
    const { data, error } = await supabase.rpc('guardar_borrador_solicitud_academica' as never, {
      p_id: id ?? null,
      p_asunto: asunto,
      p_tipo: tipo,
      p_id_destinatario: idDestinatario,
      p_id_formato: idFormato,
      p_documento: documento,
      p_descripcion: descripcion ?? null,
    } as never);
    if (error) throw error;

    const fila = Array.isArray(data) ? data[0] : data;
    const guardado = mapear(fila);
    set(estado => ({
      tramites: estado.tramites.some(t => t.id === guardado.id)
        ? estado.tramites.map(t => (t.id === guardado.id ? { ...t, ...guardado } : t))
        : [guardado, ...estado.tramites],
    }));
    return guardado;
  },

  enviar: (id, documento) =>
    ejecutar(set, get, id, 'enviar_solicitud_academica', { p_id: id, p_documento: documento }),

  eliminar: async (id) => {
    const { error } = await supabase.from('solicitudes_admin').delete().eq('id', id);
    if (error) throw error;
    set(estado => ({ tramites: estado.tramites.filter(tramite => tramite.id !== id) }));
  },

  revisar: (id, decision, observaciones) =>
    ejecutar(set, get, id, 'revisar_solicitud_academica', {
      p_id: id,
      p_decision: decision,
      p_observaciones: observaciones ?? null,
    }),
}));

/**
 * Llama a la función del servidor y recarga.
 *
 * Devuelve `false` cuando no llegó a enviar nada porque ya había otra operación en curso, para
 * que la pantalla no anuncie un éxito que no ocurrió. Se recarga en vez de parchear el estado
 * en memoria porque la operación escribe en tres tablas.
 */
async function ejecutar(
  set: (parcial: Partial<EstadoStore>) => void,
  get: () => EstadoStore,
  id: number,
  funcion: string,
  argumentos: Record<string, unknown>,
): Promise<boolean> {
  if (get().procesando !== null) return false;
  set({ procesando: id });
  try {
    const { error } = await supabase.rpc(funcion as never, argumentos as never);
    if (error) throw error;
    await get().fetchTramites(get().filtroUsuario ?? undefined);
    return true;
  } finally {
    set({ procesando: null });
  }
}
