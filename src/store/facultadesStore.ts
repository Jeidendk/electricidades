import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { debeRecargar, type OpcionesFetch } from '../lib/frescura';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type FacultadRow = Database['public']['Tables']['facultades']['Row'];
type FacultadInsert = Database['public']['Tables']['facultades']['Insert'];
type FacultadUpdate = Database['public']['Tables']['facultades']['Update'];

type CarreraRow = Database['public']['Tables']['carreras']['Row'];
type CarreraInsert = Database['public']['Tables']['carreras']['Insert'];
type CarreraUpdate = Database['public']['Tables']['carreras']['Update'];

interface FacultadesState {
  facultades: FacultadRow[];
  carreras: CarreraRow[];
  loading: boolean;
  error: string | null;
  /** Momento de la última carga correcta; null si nunca se cargó. */
  ultimaCarga: number | null;
  fetchAll: (opciones?: OpcionesFetch) => Promise<void>;
  // Facultades
  addFacultad: (data: FacultadInsert) => Promise<void>;
  updateFacultad: (id: string, patch: FacultadUpdate) => Promise<void>;
  removeFacultad: (id: string) => Promise<void>;
  // Carreras
  addCarrera: (data: CarreraInsert) => Promise<void>;
  updateCarrera: (id: string, patch: CarreraUpdate) => Promise<void>;
  removeCarrera: (id: string) => Promise<void>;
}

export const useFacultadesStore = create<FacultadesState>()((set, get) => ({
  facultades: [],
  carreras: [],
  loading: false,
  error: null,
  ultimaCarga: null,

  fetchAll: async (opciones) => {
    if (!debeRecargar(get().ultimaCarga, opciones)) return;

    set({ loading: true, error: null });
    try {
      const [facResult, carResult] = await Promise.all([
        supabase.from('facultades').select('*').order('nombre'),
        supabase.from('carreras').select('*').order('nombre'),
      ]);
      if (facResult.error) throw facResult.error;
      if (carResult.error) throw carResult.error;
      set({ facultades: facResult.data || [], carreras: carResult.data || [], ultimaCarga: Date.now() });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addFacultad: async (payload) => {
    try {
      const { data, error } = await supabase.from('facultades').insert([payload]).select().single();
      if (error) throw error;
      if (data) set((s) => ({ facultades: [...s.facultades, data] }));
    } catch (err: any) { console.error('Error adding facultad:', err); throw err; }
  },

  updateFacultad: async (id, patch) => {
    try {
      const { data, error } = await supabase.from('facultades').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (data) set((s) => ({ facultades: s.facultades.map((f) => (f.id === id ? data : f)) }));
    } catch (err: any) { console.error('Error updating facultad:', err); throw err; }
  },

  removeFacultad: async (id) => {
    try {
      const { error } = await supabase.from('facultades').delete().eq('id', id);
      if (error) throw error;
      set((s) => ({ facultades: s.facultades.filter((f) => f.id !== id) }));
    } catch (err: any) { notifyStoreError('Error removing facultad:', err); throw err; }
  },

  addCarrera: async (payload) => {
    try {
      const { data, error } = await supabase.from('carreras').insert([payload]).select().single();
      if (error) throw error;
      if (data) set((s) => ({ carreras: [...s.carreras, data] }));
    } catch (err: any) { console.error('Error adding carrera:', err); throw err; }
  },

  updateCarrera: async (id, patch) => {
    try {
      const { data, error } = await supabase.from('carreras').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (data) set((s) => ({ carreras: s.carreras.map((c) => (c.id === id ? data : c)) }));
    } catch (err: any) { console.error('Error updating carrera:', err); throw err; }
  },

  removeCarrera: async (id) => {
    try {
      const { error } = await supabase.from('carreras').delete().eq('id', id);
      if (error) throw error;
      set((s) => ({ carreras: s.carreras.filter((c) => c.id !== id) }));
    } catch (err: any) { notifyStoreError('Error removing carrera:', err); throw err; }
  },
}));
