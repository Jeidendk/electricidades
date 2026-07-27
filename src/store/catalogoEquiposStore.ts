import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type CatalogoEquiposRow = Database['public']['Tables']['catalogo_equipos']['Row'];

interface CatalogoEquiposState {
  items: CatalogoEquiposRow[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
}

export const useCatalogoEquiposStore = create<CatalogoEquiposState>()((set) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('catalogo_equipos')
        .select('*');

      if (error) throw error;
      set({ items: data as CatalogoEquiposRow[], loading: false });
    } catch (err: any) {
      console.error('Error fetching catalogo_equipos:', err);
      set({ error: err.message, loading: false });
    }
  },
}));
