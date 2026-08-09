import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { debeRecargar, type OpcionesFetch } from '../lib/frescura';
import type { Database } from '../lib/database.types';

type CatalogoEquiposRow = Database['public']['Tables']['catalogo_equipos']['Row'];

interface CatalogoEquiposState {
  items: CatalogoEquiposRow[];
  loading: boolean;
  error: string | null;
  /** Momento de la última carga correcta; null si nunca se cargó. */
  ultimaCarga: number | null;
  fetchItems: (opciones?: OpcionesFetch) => Promise<void>;
}

export const useCatalogoEquiposStore = create<CatalogoEquiposState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,
  ultimaCarga: null,

  fetchItems: async (opciones) => {
    if (!debeRecargar(get().ultimaCarga, opciones)) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('catalogo_equipos')
        .select('*');

      if (error) throw error;
      set({ items: data as CatalogoEquiposRow[], loading: false, ultimaCarga: Date.now() });
    } catch (err: any) {
      console.error('Error fetching catalogo_equipos:', err);
      set({ error: err.message, loading: false });
    }
  },
}));
