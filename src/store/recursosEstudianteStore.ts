import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface RecursoEstudianteItem {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  nivel: string;
  materia: string;
  formato: string;
  peso: string;
  foto: string;
}

interface RecursosEstudianteState {
  items: RecursoEstudianteItem[];
  loading: boolean;
  error: string | null;
  fetchRecursos: () => Promise<void>;
}

export const useRecursosEstudianteStore = create<RecursosEstudianteState>()((set) => ({
  items: [],
  loading: false,
  error: null,

  fetchRecursos: async () => {
    set({ loading: true, error: null });
    try {
      // Intentar obtener recursos y sus relaciones si existen
      const { data, error } = await supabase
        .from('recursos')
        .select(`
          *,
          materia_recursos (
            materias ( nombre, semestre )
          )
        `);

      if (error) throw error;

      const formatted = (data as any[]).map(d => {
        let materia = 'General';
        let nivel = 'Varios';
        
        if (d.materia_recursos && d.materia_recursos.length > 0) {
          const mat = d.materia_recursos[0].materias;
          if (mat) {
            materia = mat.nombre;
            nivel = `${mat.semestre}er PAO`; // Simplified
          }
        }

        return {
          id: d.id.toString(),
          tipo: d.tipo === 'libro' ? 'Libros' : d.tipo === 'software' ? 'Software' : 'Sílabos',
          titulo: d.titulo,
          descripcion: d.descripcion || d.autor || '',
          nivel,
          materia,
          formato: d.formato,
          peso: d.size_desc || 'Desconocido',
          foto: d.portada_url || 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=600&auto=format&fit=crop'
        };
      });

      set({ items: formatted, loading: false });
    } catch (err: any) {
      console.error('Error fetching recursos_estudiante:', err);
      set({ error: err.message, loading: false });
    }
  }
}));
