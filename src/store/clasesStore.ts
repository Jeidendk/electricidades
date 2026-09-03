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
  /** Inserta varias clases de una sola vez (importación). Devuelve cuántas se insertaron. */
  addClases: (data: ClaseInsert[]) => Promise<number>;
  updateClase: (id: string, patch: ClaseUpdate) => Promise<void>;
  removeClase: (id: string) => Promise<void>;
  /** Borra las clases de un aula. Devuelve cuántas filas se eliminaron realmente. */
  removeClasesByEspacio: (idEspacio: string) => Promise<number>;
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
        .select('*, materias(nombre, codigo, id_carrera, semestre), espacios(nombre, id_edificio, tipo), docentes:usuarios!clases_id_docente_fkey(nombre, titulo)')
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

  addClases: async (payloads) => {
    if (payloads.length === 0) return 0;
    try {
      const { data, error } = await supabase.from('clases').insert(payloads).select('id');
      if (error) throw error;
      await useClasesStore.getState().fetchClases();
      return data?.length ?? 0;
    } catch (err: any) {
      notifyStoreError('Error importing clases:', err);
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

  removeClasesByEspacio: async (idEspacio) => {
    try {
      // .select() devuelve solo las filas realmente borradas: con RLS puede eliminarse
      // menos de lo esperado, y quien llama necesita saberlo para avisar al usuario.
      const { data, error } = await supabase
        .from('clases')
        .delete()
        .eq('id_espacio', idEspacio)
        .select('id');
      if (error) throw error;

      const idsEliminados = new Set((data || []).map((fila) => fila.id));
      set((s) => ({ clases: s.clases.filter((c) => !idsEliminados.has(c.id)) }));
      return idsEliminados.size;
    } catch (err: any) {
      notifyStoreError('Error removing clases by espacio:', err);
      throw err;
    }
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
