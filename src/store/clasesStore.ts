import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type ClaseRow = Database['public']['Tables']['clases']['Row'];
type ClaseInsert = Database['public']['Tables']['clases']['Insert'];
type ClaseUpdate = Database['public']['Tables']['clases']['Update'];

interface ClasesState {
  clases: ClaseRow[];
  loading: boolean;
  error: string | null;
  fetchClases: () => Promise<void>;
  addClase: (data: ClaseInsert) => Promise<void>;
  updateClase: (id: string, patch: ClaseUpdate) => Promise<void>;
  removeClase: (id: string) => Promise<void>;
  removeAllClases: () => Promise<void>;
}

export const useClasesStore = create<ClasesState>()((set) => ({
  clases: [],
  loading: false,
  error: null,

  fetchClases: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('clases')
        .select('*, materias(nombre, codigo, id_carrera), espacios(nombre, id_edificio, tipo), docentes:usuarios!clases_id_docente_fkey(nombre)')
        .order('dia')
        .order('hora_inicio');
      if (error) throw error;
      set({ clases: (data as any[]) || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addClase: async (payload) => {
    try {
      const { error } = await supabase.from('clases').insert([payload]);
      if (error) throw error;
      await useClasesStore.getState().fetchClases();
    } catch (err: any) { 
      console.error('Error adding clase:', err); 
      throw err;
    }
  },

  updateClase: async (id, patch) => {
    try {
      const { data, error } = await supabase
        .from('clases')
        .update(patch)
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('No tienes permiso para editar una clase creada por otro usuario.');
      await useClasesStore.getState().fetchClases();
    } catch (err: any) { notifyStoreError('Error updating clase:', err); throw err; }
  },

  removeClase: async (id) => {
    try {
      const { data, error } = await supabase
        .from('clases')
        .delete()
        .eq('id', id)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('No tienes permiso para eliminar una clase creada por otro usuario.');
      set((s) => ({ clases: s.clases.filter((c) => c.id !== id) }));
    } catch (err: any) { notifyStoreError('Error removing clase:', err); throw err; }
  },

  removeAllClases: async () => {
    try {
      // Borrado masivo: elimina todas las filas de clases
      const { error } = await supabase.from('clases').delete().not('id', 'is', null);
      if (error) throw error;
      set({ clases: [] });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
}));
