import { create } from 'zustand';
import { supabase } from '../lib/supabase';

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
  estado: 'Aprobada' | 'Pendiente' | 'Devuelto' | 'Rechazada';
  observacion?: string;
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
        .select(`
          *,
          materias ( nombre )
        `)
        .eq('id_usuario', userId)
        .order('fecha', { ascending: false });

      if (error) throw error;

      const formatted = (data as any[]).map((d): SolicitudEquipo => {
        const itemsList = (d.items as SolicitudItem[]) || [];
        return {
          id: d.id.toString(),
          numero: d.numero,
          asignatura: d.materias?.nombre || 'Desconocida',
          fecha: d.fecha,
          hora: d.hora,
          estado: d.estado as any,
          items: itemsList,
          itemsStr: itemsList.map(i => i.nombre).join(', '),
          observacion: d.observacion
        };
      });

      set({ items: formatted, loading: false });
    } catch (err: any) {
      console.error('Error fetching solicitudes_equipo:', err);
      set({ error: err.message, loading: false });
    }
  },

  cancelarSolicitud: async (id: string) => {
    try {
      const { error } = await supabase
        .from('solicitudes_equipo')
        .update({ estado: 'Rechazada' })
        .eq('id', id);

      if (error) throw error;
      
      set(state => ({
        items: state.items.map(item => item.id === id ? { ...item, estado: 'Rechazada' } : item)
      }));
    } catch (err: any) {
      console.error('Error canceling solicitud:', err);
      throw err;
    }
  }
}));
