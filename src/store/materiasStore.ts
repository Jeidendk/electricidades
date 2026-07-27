import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type MateriaRow = Database['public']['Tables']['materias']['Row'];
type MateriaInsert = Database['public']['Tables']['materias']['Insert'];
type MateriaUpdate = Database['public']['Tables']['materias']['Update'];

interface MateriasState {
  materias: MateriaRow[];
  loading: boolean;
  error: string | null;
  fetchMaterias: (idCarrera?: string) => Promise<void>;
  addMateria: (data: MateriaInsert) => Promise<void>;
  updateMateria: (id: string, patch: MateriaUpdate) => Promise<void>;
  removeMateria: (id: string) => Promise<void>;
}

export const useMateriasStore = create<MateriasState>()((set) => ({
  materias: [],
  loading: false,
  error: null,

  fetchMaterias: async (idCarrera?: string) => {
    set({ loading: true, error: null });
    try {
      let query = supabase.from('materias').select('*').order('semestre').order('nombre');
      if (idCarrera) query = query.eq('id_carrera', idCarrera);
      const { data, error } = await query;
      if (error) throw error;
      set({ materias: data || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addMateria: async (payload) => {
    try {
      const { data, error } = await supabase.from('materias').insert([payload]).select().single();
      if (error) throw error;
      if (data) set((s) => ({ materias: [...s.materias, data] }));
    } catch (err: any) { notifyStoreError('Error adding materia:', err); throw err; }
  },

  updateMateria: async (id, patch) => {
    try {
      const { data, error } = await supabase.from('materias').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (data) set((s) => ({ materias: s.materias.map((m) => (m.id === id ? data : m)) }));
    } catch (err: any) { notifyStoreError('Error updating materia:', err); throw err; }
  },

  removeMateria: async (id) => {
    try {
      const { error } = await supabase.from('materias').delete().eq('id', id);
      if (error) throw error;
      set((s) => ({ materias: s.materias.filter((m) => m.id !== id) }));
    } catch (err: any) { notifyStoreError('Error removing materia:', err); throw err; }
  },
}));
