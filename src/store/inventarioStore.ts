import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { debeRecargar, type OpcionesFetch } from '../lib/frescura';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type InventarioRow = Database['public']['Tables']['inventario']['Row'];
type InventarioInsert = Database['public']['Tables']['inventario']['Insert'];
type InventarioUpdate = Database['public']['Tables']['inventario']['Update'];

interface InventarioState {
  items: InventarioRow[];
  loading: boolean;
  error: string | null;
  /** Momento de la última carga correcta; null si nunca se cargó. */
  ultimaCarga: number | null;
  fetchItems: (opciones?: OpcionesFetch) => Promise<void>;
  addItem: (data: InventarioInsert) => Promise<void>;
  updateItem: (id: string, patch: InventarioUpdate) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
}

export const useInventarioStore = create<InventarioState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,
  ultimaCarga: null,

  fetchItems: async (opciones) => {
    if (!debeRecargar(get().ultimaCarga, opciones)) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('inventario').select('*');
      if (error) throw error;
      set({ items: data || [], ultimaCarga: Date.now() });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (data) => {
    try {
      const { data: newData, error } = await supabase
        .from('inventario')
        .insert([data])
        .select()
        .single();
        
      if (error) throw error;
      if (newData) {
        set((state) => ({ items: [...state.items, newData] }));
      }
    } catch (err: any) {
      console.error('Error adding item:', err);
      throw err;
    }
  },

  updateItem: async (id, patch) => {
    try {
      const { data, error } = await supabase
        .from('inventario')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      if (data) {
        set((state) => ({
          items: state.items.map(it => it.id === id ? data : it)
        }));
      }
    } catch (err: any) {
      notifyStoreError('Error updating item:', err);
      throw err;
    }
  },

  removeItem: async (id) => {
    try {
      const { error } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      set((state) => ({
        items: state.items.filter(it => it.id !== id)
      }));
    } catch (err: any) {
      notifyStoreError('Error removing item:', err);
      throw err;
    }
  }
}));

