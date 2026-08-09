import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { debeRecargar, type OpcionesFetch } from '../lib/frescura';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type PrestamoRow = Database['public']['Tables']['prestamos']['Row'];
type PrestamoInsert = Database['public']['Tables']['prestamos']['Insert'];
type PrestamoUpdate = Database['public']['Tables']['prestamos']['Update'];

interface PrestamosState {
  prestamos: PrestamoRow[];
  loading: boolean;
  error: string | null;
  /** Momento de la última carga correcta; null si nunca se cargó. */
  ultimaCarga: number | null;
  fetchPrestamos: (opciones?: OpcionesFetch) => Promise<void>;
  addPrestamo: (data: PrestamoInsert) => Promise<void>;
  updatePrestamo: (id: string, patch: PrestamoUpdate) => Promise<void>;
  removePrestamo: (id: string) => Promise<void>;
}

export const usePrestamosStore = create<PrestamosState>((set, get) => ({
  prestamos: [],
  loading: false,
  error: null,
  ultimaCarga: null,

  fetchPrestamos: async (opciones) => {
    if (!debeRecargar(get().ultimaCarga, opciones)) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('prestamos').select('*');
      if (error) throw error;
      set({ prestamos: data || [], ultimaCarga: Date.now() });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addPrestamo: async (data) => {
    try {
      const { data: newData, error } = await supabase
        .from('prestamos')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      if (newData) {
        set((state) => ({ prestamos: [newData, ...state.prestamos] }));
      }
    } catch (err: any) {
      console.error('Error adding prestamo:', err);
      throw err;
    }
  },

  updatePrestamo: async (id, patch) => {
    try {
      const { data, error } = await supabase
        .from('prestamos')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        set((state) => ({
          prestamos: state.prestamos.map(p => p.id === id ? data : p)
        }));
      }
    } catch (err: any) {
      notifyStoreError('Error updating prestamo:', err);
      throw err;
    }
  },

  removePrestamo: async (id) => {
    try {
      const { error } = await supabase
        .from('prestamos')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      set((state) => ({
        prestamos: state.prestamos.filter(p => p.id !== id)
      }));
    } catch (err: any) {
      notifyStoreError('Error removing prestamo:', err);
      throw err;
    }
  }
}));

