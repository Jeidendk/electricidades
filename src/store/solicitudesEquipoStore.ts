/**
 * Las solicitudes de equipos del propio estudiante.
 *
 * La política RLS de la migración 0043 ya limita la consulta a sus filas; el `.eq('id_usuario')`
 * se conserva porque el admin también entra a esta pantalla con "Ver como" y ahí sí vería todas.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { EstadoSolicitudEquipo } from '../modules/admin/data/flujoPrestamos';

export interface SolicitudItem {
  nombre: string;
  serie: string;
  categoria: string;
  cantidad: number;
}

export interface SolicitudEquipo {
  id: string;
  numero: string;
  asignatura: string;
  itemsStr: string;
  items: SolicitudItem[];
  fecha: string;
  hora: string;
  estado: EstadoSolicitudEquipo;
  observacion?: string;
  /** Por qué se rechazó o canceló. Es lo primero que el estudiante busca. */
  motivoRechazo?: string;
}

interface SolicitudesEquipoState {
  items: SolicitudEquipo[];
  loading: boolean;
  error: string | null;
  fetchItems: (userId: string) => Promise<void>;
  cancelarSolicitud: (id: string) => Promise<void>;
}

export const useSolicitudesEquipoStore = create<SolicitudesEquipoState>()((set) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('solicitudes_equipo')
        .select('*, materias ( nombre )')
        .eq('id_usuario', userId)
        .order('fecha', { ascending: false });

      if (error) throw error;

      const formatted = (data as any[]).map((d): SolicitudEquipo => {
        const itemsList = (d.items as SolicitudItem[]) || [];
        return {
          id: d.id.toString(),
          numero: d.numero,
          // La materia de la malla manda sobre el texto libre, que es solo el respaldo.
          asignatura: d.materias?.nombre || d.asignatura_libre || 'Sin registrar',
          fecha: d.fecha,
          hora: d.hora,
          estado: d.estado,
          items: itemsList,
          itemsStr: itemsList.map(i => i.nombre).join(', '),
          observacion: d.observacion,
          motivoRechazo: d.motivo_rechazo ?? undefined,
        };
      });

      set({ items: formatted, loading: false });
    } catch (err: any) {
      // La lista no se vacía: mostrar "sin solicitudes" cuando la consulta falló haría creer
      // que nunca se envió nada.
      set({ error: err?.message || 'No se pudieron cargar tus solicitudes.', loading: false });
    }
  },

  cancelarSolicitud: async (id: string) => {
    // Cancelar no es rechazar: antes se escribía `estado = 'Rechazada'` directamente en la
    // tabla, así que el historial no distinguía "me arrepentí" de "el laboratorio lo negó" —y,
    // al ser un update directo, un estudiante podía cambiar el estado de cualquier solicitud.
    const { error } = await supabase.rpc('cancelar_solicitud_equipo' as never, {
      p_id: Number(id),
      p_motivo: null,
    } as never);
    if (error) throw error;

    set(estado => ({
      items: estado.items.map(item => (item.id === id ? { ...item, estado: 'Cancelada' } : item)),
    }));
  },
}));
