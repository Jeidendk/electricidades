/**
 * Solicitudes de equipos vistas por el personal.
 *
 * Aprobar, entregar, rechazar y cancelar **no se escriben desde aquí**: cada una es una llamada
 * a la función correspondiente de la migración 0043, que valida permisos y disponibilidad en el
 * servidor y se ejecuta entera o no se ejecuta. Antes eran dos escrituras sueltas —insertar los
 * préstamos y actualizar la solicitud— y si la segunda fallaba quedaban préstamos huérfanos.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { componerNombreCompleto } from '../lib/texto';
import { DIAS_PRESTAMO_POR_DEFECTO, type EstadoSolicitudEquipo } from '../modules/admin/data/flujoPrestamos';

/** Ítem tal como lo guarda el estudiante dentro de `solicitudes_equipo.items`. */
export interface SolEquipoItem {
  /** Unidad representante del grupo del catálogo. Informativa: el servidor elige las unidades. */
  id_equipo?: string;
  nombre: string;
  serie?: string;
  categoria?: string;
  /** Ubicación del grupo. Con ella el servidor sabe de qué laboratorio sacar las unidades. */
  id_espacio?: string | null;
  cantidad: number;
}

export interface SolEquipoAdmin {
  id: number;
  numero: string;
  id_usuario: string | null;
  estudiante: string;
  carrera: string | null;
  asignatura: string | null;
  fecha: string;
  hora: string;
  estado: EstadoSolicitudEquipo;
  items: SolEquipoItem[];
  observacion: string | null;
  motivoRechazo: string | null;
  decididoPor: string | null;
  decididoEn: string | null;
}

interface State {
  solicitudes: SolEquipoAdmin[];
  loading: boolean;
  /** Mensaje de la última consulta fallida. La pantalla lo muestra en vez de "sin solicitudes". */
  error: string | null;
  /** Id de la solicitud que está siendo procesada, para bloquear su botón. */
  procesando: number | null;
  fetchSolicitudes: () => Promise<void>;
  /** Devuelven `false` si ya había otra operación en curso: nada se envió. */
  aprobar: (id: number, dias?: number) => Promise<boolean>;
  entregar: (id: number, dias?: number) => Promise<boolean>;
  rechazar: (id: number, motivo: string) => Promise<boolean>;
  cancelar: (id: number, motivo?: string) => Promise<boolean>;
}

const mapear = (fila: any): SolEquipoAdmin => ({
  id: fila.id,
  numero: fila.numero,
  id_usuario: fila.id_usuario,
  estudiante: componerNombreCompleto(fila.usuarios?.nombre, fila.usuarios?.apellido) || 'Estudiante',
  carrera: fila.usuarios?.carrera_nombre ?? null,
  // La materia de la malla manda; el texto libre es el respaldo de quien no tiene malla cargada.
  asignatura: fila.materias?.nombre ?? fila.asignatura_libre ?? null,
  fecha: fila.fecha,
  hora: fila.hora,
  estado: fila.estado,
  items: Array.isArray(fila.items) ? fila.items : [],
  observacion: fila.observacion,
  motivoRechazo: fila.motivo_rechazo ?? null,
  decididoPor: fila.decididor ? componerNombreCompleto(fila.decididor.nombre, fila.decididor.apellido) : null,
  decididoEn: fila.decidido_en ?? null,
});

export const useSolicitudesEquipoAdminStore = create<State>()((set, get) => ({
  solicitudes: [],
  loading: false,
  error: null,
  procesando: null,

  fetchSolicitudes: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('solicitudes_equipo')
        .select(`
          *,
          usuarios:id_usuario (nombre, apellido, carrera_nombre),
          materias:id_materia (nombre),
          decididor:decidido_por (nombre, apellido)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ solicitudes: (data as any[] || []).map(mapear) });
    } catch (err: any) {
      // No se vacía la lista: mostrar cero solicitudes por una consulta fallida haría creer que
      // no hay nada pendiente.
      set({ error: err?.message || 'No se pudieron cargar las solicitudes.' });
    } finally {
      set({ loading: false });
    }
  },

  aprobar: (id, dias) =>
    ejecutarOperacion(set, get, id, 'aprobar_solicitud_equipo', { p_id: id, p_dias: dias ?? DIAS_PRESTAMO_POR_DEFECTO }),

  entregar: (id, dias) =>
    ejecutarOperacion(set, get, id, 'entregar_solicitud_equipo', { p_id: id, p_dias: dias ?? null }),

  rechazar: (id, motivo) =>
    ejecutarOperacion(set, get, id, 'rechazar_solicitud_equipo', { p_id: id, p_motivo: motivo }),

  cancelar: (id, motivo) =>
    ejecutarOperacion(set, get, id, 'cancelar_solicitud_equipo', { p_id: id, p_motivo: motivo ?? null }),
}));

/**
 * Llama a la función del servidor y recarga desde la base.
 *
 * Se recarga en vez de parchear el estado en memoria porque la operación cambia dos tablas
 * (solicitud y préstamos) y adivinar el resultado es justo lo que hacía que la pantalla mostrara
 * algo distinto de lo guardado. `procesando` impide el segundo clic; el servidor impide el resto.
 *
 * Devuelve `false` cuando no llegó a enviar nada, para que la pantalla no anuncie un éxito que
 * no ocurrió.
 */
async function ejecutarOperacion(
  set: (parcial: Partial<State>) => void,
  get: () => State,
  id: number,
  funcion: string,
  argumentos: Record<string, unknown>,
): Promise<boolean> {
  if (get().procesando !== null) return false;
  set({ procesando: id });
  try {
    const { error } = await supabase.rpc(funcion as never, argumentos as never);
    if (error) throw error;
    await get().fetchSolicitudes();
    return true;
  } finally {
    set({ procesando: null });
  }
}
