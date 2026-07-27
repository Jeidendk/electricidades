import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type EdificioRow = Database['public']['Tables']['edificios']['Row'];
type EdificioInsert = Database['public']['Tables']['edificios']['Insert'];
type EdificioUpdate = Database['public']['Tables']['edificios']['Update'];

interface EdificiosState {
  items: EdificioRow[];
  loading: boolean;
  error: string | null;
  fetchEdificios: () => Promise<void>;
  addEdificio: (data: EdificioInsert) => Promise<void>;
  updateEdificio: (id: string, patch: EdificioUpdate) => Promise<void>;
  removeEdificio: (id: string) => Promise<void>;
}

export const useEdificiosStore = create<EdificiosState>()((set) => ({
  items: [],
  loading: false,
  error: null,

  fetchEdificios: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('edificios').select(`
        *,
        espacios ( id, nombre, piso, tipo, capacidad, estado )
      `);
      if (error) throw error;
      set({ items: data || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addEdificio: async (payload) => {
    try {
      const { data, error } = await supabase.from('edificios').insert([payload]).select().single();
      if (error) throw error;
      if (data) set((s) => ({ items: [...s.items, data] }));
    } catch (err: any) {
      notifyStoreError('Error adding edificio:', err);
      throw err;
    }
  },

  updateEdificio: async (id, patch) => {
    try {
      const { data, error } = await supabase.from('edificios').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (data) set((s) => ({ items: s.items.map((it) => (it.id === id ? data : it)) }));
    } catch (err: any) {
      notifyStoreError('Error updating edificio:', err);
      throw err;
    }
  },

  removeEdificio: async (id) => {
    try {
      const { error } = await supabase.from('edificios').delete().eq('id', id);
      if (error) throw error;
      set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
    } catch (err: any) {
      notifyStoreError('Error removing edificio:', err);
      throw err;
    }
  },
}));
