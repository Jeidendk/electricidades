import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type OrdenRow = Database['public']['Tables']['ordenes_mantenimiento']['Row'];
type OrdenInsert = Database['public']['Tables']['ordenes_mantenimiento']['Insert'];
type OrdenUpdate = Database['public']['Tables']['ordenes_mantenimiento']['Update'];

interface MantenimientoState {
  ordenes: OrdenRow[];
  loading: boolean;
  error: string | null;
  fetchOrdenes: () => Promise<void>;
  addOrden: (data: OrdenInsert) => Promise<void>;
  updateOrden: (id: string, patch: OrdenUpdate) => Promise<void>;
  removeOrden: (id: string) => Promise<void>;
}

export const useMantenimientoStore = create<MantenimientoState>((set) => ({
  ordenes: [],
  loading: false,
  error: null,

  fetchOrdenes: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('ordenes_mantenimiento').select('*');
      if (error) throw error;
      set({ ordenes: data || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addOrden: async (data) => {
    try {
      const { data: newData, error } = await supabase
        .from('ordenes_mantenimiento')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      if (newData) {
        set((state) => ({ ordenes: [newData, ...state.ordenes] }));
      }
    } catch (err: any) {
      console.error('Error adding orden:', err);
      throw err;
    }
  },

  updateOrden: async (id, patch) => {
    try {
      const { data, error } = await supabase
        .from('ordenes_mantenimiento')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        set((state) => ({
          ordenes: state.ordenes.map(o => o.id === id ? data : o)
        }));
      }
    } catch (err: any) {
      notifyStoreError('Error updating orden:', err);
      throw err;
    }
  },

  removeOrden: async (id) => {
    try {
      const { error } = await supabase
        .from('ordenes_mantenimiento')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      set((state) => ({
        ordenes: state.ordenes.filter(o => o.id !== id)
      }));
    } catch (err: any) {
      notifyStoreError('Error removing orden:', err);
      throw err;
    }
  }
}));

