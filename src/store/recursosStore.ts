import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type RecursoRow = Database['public']['Tables']['recursos']['Row'];
type RecursoInsert = Database['public']['Tables']['recursos']['Insert'];
type RecursoUpdate = Database['public']['Tables']['recursos']['Update'];

interface RecursosState {
  recursos: RecursoRow[];
  loading: boolean;
  error: string | null;
  fetchRecursos: () => Promise<void>;
  addRecurso: (data: RecursoInsert) => Promise<void>;
  updateRecurso: (id: number, patch: RecursoUpdate) => Promise<void>;
  removeRecurso: (id: number) => Promise<void>;
}

export const useRecursosStore = create<RecursosState>((set) => ({
  recursos: [],
  loading: false,
  error: null,

  fetchRecursos: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('recursos').select('*');
      if (error) throw error;
      set({ recursos: data || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addRecurso: async (data) => {
    try {
      const { data: newData, error } = await supabase
        .from('recursos')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      if (newData) {
        set((state) => ({ recursos: [...state.recursos, newData] }));
      }
    } catch (err: any) {
      notifyStoreError('Error adding recurso:', err);
      throw err;
    }
  },

  updateRecurso: async (id, patch) => {
    try {
      const { data, error } = await supabase
        .from('recursos')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        set((state) => ({
          recursos: state.recursos.map(r => r.id === id ? data : r)
        }));
      }
    } catch (err: any) {
      notifyStoreError('Error updating recurso:', err);
      throw err;
    }
  },

  removeRecurso: async (id) => {
    try {
      const { error } = await supabase
        .from('recursos')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      set((state) => ({
        recursos: state.recursos.filter(r => r.id !== id)
      }));
    } catch (err: any) {
      notifyStoreError('Error removing recurso:', err);
      throw err;
    }
  }
}));

