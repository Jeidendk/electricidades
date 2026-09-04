import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type SolicitudAdminRow = Database['public']['Tables']['solicitudes_admin']['Row'];
type SolicitudAdminInsert = Database['public']['Tables']['solicitudes_admin']['Insert'];
type SolicitudAdminUpdate = Database['public']['Tables']['solicitudes_admin']['Update'];

interface SolicitudesAdminState {
  solicitudes: SolicitudAdminRow[];
  loading: boolean;
  error: string | null;
  fetchSolicitudes: () => Promise<void>;
  addSolicitud: (data: SolicitudAdminInsert) => Promise<void>;
  updateSolicitud: (id: number, patch: SolicitudAdminUpdate) => Promise<void>;
  removeSolicitud: (id: number) => Promise<void>;
}

export const useSolicitudesAdminStore = create<SolicitudesAdminState>()((set) => ({
  solicitudes: [],
  loading: false,
  error: null,

  fetchSolicitudes: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('solicitudes_admin')
        .select('*, usuarios(nombre, apellido, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ solicitudes: (data as any[]) || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addSolicitud: async (payload) => {
    try {
      const { data, error } = await supabase.from('solicitudes_admin').insert([payload]).select().single();
      if (error) throw error;
      if (data) set((s) => ({ solicitudes: [data, ...s.solicitudes] }));
    } catch (err: any) { notifyStoreError('Error adding solicitud:', err); throw err; }
  },

  updateSolicitud: async (id, patch) => {
    try {
      const { data, error } = await supabase.from('solicitudes_admin').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (data) set((s) => ({ solicitudes: s.solicitudes.map((it) => (it.id === id ? data : it)) }));
    } catch (err: any) { notifyStoreError('Error updating solicitud:', err); throw err; }
  },

  removeSolicitud: async (id) => {
    try {
      const { error } = await supabase.from('solicitudes_admin').delete().eq('id', id);
      if (error) throw error;
      set((s) => ({ solicitudes: s.solicitudes.filter((it) => it.id !== id) }));
    } catch (err: any) { notifyStoreError('Error removing solicitud:', err); throw err; }
  },
}));
