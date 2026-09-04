import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { componerNombreCompleto } from '../lib/texto';

export interface Docente {
  id: string;
  /** Nombre completo ya compuesto: la base guarda `nombre` y `apellido` por separado. */
  nombre: string;
  titulo: string | null;
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
        .select('id, nombre, apellido, titulo, estado, facultad_nombre, roles!inner(nombre)')
        .eq('roles.nombre', 'Docente')
        // Por apellido, que es como se busca a alguien en un listado de personas.
        .order('apellido')
        .order('nombre');
      if (error) throw error;
      set({
        docentes: ((data as any[]) || []).map((usuario) => ({
          id: usuario.id,
          nombre: componerNombreCompleto(usuario.nombre, usuario.apellido),
          titulo: usuario.titulo || null,
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
