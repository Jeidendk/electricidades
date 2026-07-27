import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';

type FormatoRow = Database['public']['Tables']['formatos']['Row'];
type FormatoInsert = Database['public']['Tables']['formatos']['Insert'];
type FormatoUpdate = Database['public']['Tables']['formatos']['Update'];

interface FormatosState {
  formatos: FormatoRow[];
  loading: boolean;
  error: string | null;
  fetchFormatos: () => Promise<void>;
  addFormato: (data: FormatoInsert) => Promise<void>;
  updateFormato: (id: string, patch: FormatoUpdate) => Promise<void>;
  removeFormato: (id: string) => Promise<void>;
}

export const useFormatosStore = create<FormatosState>()((set) => ({
  formatos: [],
  loading: false,
  error: null,

  fetchFormatos: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('formatos').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      set({ formatos: data || [] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  addFormato: async (payload) => {
    try {
      const { data, error } = await supabase.from('formatos').insert([payload]).select().single();
      if (error) throw error;
      if (data) set((s) => ({ formatos: [data, ...s.formatos] }));
    } catch (err: any) { notifyStoreError('Error adding formato:', err); throw err; }
  },

  updateFormato: async (id, patch) => {
    try {
      const { data, error } = await supabase.from('formatos').update(patch).eq('id', id).select().single();
      if (error) throw error;
      if (data) set((s) => ({ formatos: s.formatos.map((f) => (f.id === id ? data : f)) }));
    } catch (err: any) { notifyStoreError('Error updating formato:', err); throw err; }
  },

  removeFormato: async (id) => {
    try {
      const { error } = await supabase.from('formatos').delete().eq('id', id);
      if (error) throw error;
      set((s) => ({ formatos: s.formatos.filter((f) => f.id !== id) }));
    } catch (err: any) { notifyStoreError('Error removing formato:', err); throw err; }
  },
}));
