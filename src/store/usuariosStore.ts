import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchPage, type PageParams } from '../lib/pagination';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type UsuarioRow = Database['public']['Tables']['usuarios']['Row'];
type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update'];

interface UsuariosState {
  items: UsuarioRow[];
  loading: boolean;
  error: string | null;
  total: number;
  totalPages: number;
  fetchUsuarios: () => Promise<void>;
  fetchUsuariosPage: (params: PageParams) => Promise<void>;
  addUsuario: (payload: Record<string, any>) => Promise<void>;
  updateUsuario: (id: string, patch: UsuarioUpdate) => Promise<void>;
  removeUsuario: (id: string) => Promise<void>;
}

export const useUsuariosStore = create<UsuariosState>()((set) => ({
  items: [],
  loading: false,
  error: null,
  total: 0,
  totalPages: 1,

  fetchUsuarios: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, roles(nombre)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ items: (data as any[]) || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  // Paginación server-side (patrón de referencia para el resto de stores):
  // solo trae la página visible + total, en vez de toda la tabla.
  fetchUsuariosPage: async (params) => {
    set({ loading: true, error: null });
    try {
      const { rows, total, totalPages } = await fetchPage<UsuarioRow>(
        'usuarios',
        { orderBy: 'created_at', ascending: false, searchColumns: ['nombre', 'email'], ...params },
        '*, roles(nombre)',
      );
      set({ items: rows, total, totalPages });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addUsuario: async (payload) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert(payload)
        .select('*, roles(nombre)')
        .single();
      if (error) throw error;
      if (data) set((s) => ({ items: [data as any, ...s.items] }));
    } catch (err: any) {
      notifyStoreError('Error creating usuario:', err);
      throw err;
    }
  },

  updateUsuario: async (id, patch) => {
    try {
      const { data, error } = await supabase.from('usuarios').update(patch).eq('id', id).select('*, roles(nombre)').single();
      if (error) throw error;
      if (data) set((s) => ({ items: s.items.map((it) => (it.id === id ? data : it)) }));
    } catch (err: any) {
      notifyStoreError('Error updating usuario:', err);
      throw err;
    }
  },

  removeUsuario: async (id) => {
    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);
      if (error) throw error;
      set((s) => ({ items: s.items.filter((it) => it.id !== id) }));
    } catch (err: any) {
      notifyStoreError('Error removing usuario:', err);
      throw err;
    }
  },
}));
