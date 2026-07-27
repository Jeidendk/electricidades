import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type EspacioRow = Database['public']['Tables']['espacios']['Row'];
type EspacioInsert = Database['public']['Tables']['espacios']['Insert'];
type EspacioUpdate = Database['public']['Tables']['espacios']['Update'];

interface EspaciosState {
  items: EspacioRow[];
  loading: boolean;
  error: string | null;
  fetchEspacios: () => Promise<void>;
  addEspacio: (data: EspacioInsert) => Promise<void>;
  updateEspacio: (id: string, patch: EspacioUpdate) => Promise<void>;
  removeEspacio: (id: string) => Promise<void>;
}

export const useEspaciosStore = create<EspaciosState>((set) => ({
  items: [],
  loading: false,
  error: null,

  fetchEspacios: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('espacios').select('*');
      if (error) throw error;
      set({ items: data || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addEspacio: async (data) => {
    try {
      const { data: newData, error } = await supabase
        .from('espacios')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      if (newData) {
        set((state) => ({ items: [...state.items, newData] }));
      }
    } catch (err: any) {
      console.error('Error adding espacio:', err);
      throw err;
    }
  },

  updateEspacio: async (id, patch) => {
    try {
      const { data, error } = await supabase
        .from('espacios')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        set((state) => ({
          items: state.items.map(item => item.id === id ? data : item)
        }));
      }
    } catch (err: any) {
      console.error('Error updating espacio:', err);
      throw err;
    }
  },

  removeEspacio: async (id) => {
    try {
      const { error } = await supabase
        .from('espacios')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      set((state) => ({
        items: state.items.filter(it => it.id !== id)
      }));
    } catch (err: any) {
      notifyStoreError('Error removing espacio:', err);
      throw err;
    }
  }
}));

