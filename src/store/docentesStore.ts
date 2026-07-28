import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Docente {
  id: string;
  nombre: string;
  estado: string;
  facultad_nombre: string | null;
}

interface DocentesState {
  docentes: Docente[];
  loading: boolean;
  error: string | null;
  fetchDocentes: () => Promise<void>;
}

export const useDocentesStore = create<DocentesState>()((set) => ({
  docentes: [],
  loading: false,
  error: null,

  fetchDocentes: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, estado, facultad_nombre, roles!inner(nombre)')
        .eq('roles.nombre', 'Docente')
        .order('nombre');
      if (error) throw error;
      set({
        docentes: ((data as any[]) || []).map((usuario) => ({
          id: usuario.id,
          nombre: usuario.nombre,
          estado: usuario.estado,
          facultad_nombre: usuario.facultad_nombre || null,
        })),
      });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
}));
