import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Map: materiaId -> recursoIds[]
type RecursosMap = Record<string, number[]>;

interface MateriaRecursosState {
  recursosMap: RecursosMap;
  fetchByMaterias: (materiaIds: string[]) => Promise<void>;
  toggleRecurso: (materiaId: string, recursoId: number) => Promise<void>;
}

export const useMateriaRecursosStore = create<MateriaRecursosState>()((set, get) => ({
  recursosMap: {},

  fetchByMaterias: async (materiaIds: string[]) => {
    if (!materiaIds.length) return;
    try {
      const { data, error } = await supabase
        .from('materia_recursos')
        .select('id_materia, id_recurso')
        .in('id_materia', materiaIds);
      if (error) throw error;
      const map: RecursosMap = {};
      (data || []).forEach((row) => {
        if (!map[row.id_materia]) map[row.id_materia] = [];
        map[row.id_materia].push(row.id_recurso);
      });
      set({ recursosMap: map });
    } catch (err: any) {
      console.error('Error fetching materia_recursos:', err);
    }
  },

  toggleRecurso: async (materiaId: string, recursoId: number) => {
    const { recursosMap } = get();
    const current = recursosMap[materiaId] || [];
    const isLinked = current.includes(recursoId);

    // Optimistic update
    const updated = isLinked
      ? current.filter((id) => id !== recursoId)
      : [...current, recursoId];
    set({ recursosMap: { ...recursosMap, [materiaId]: updated } });

    try {
      if (isLinked) {
        const { error } = await supabase
          .from('materia_recursos')
          .delete()
          .eq('id_materia', materiaId)
          .eq('id_recurso', recursoId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('materia_recursos')
          .insert([{ id_materia: materiaId, id_recurso: recursoId, tipo: 'recomendado' }]);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Error toggling recurso:', err);
      // Revert on error
      set({ recursosMap: { ...get().recursosMap, [materiaId]: current } });
    }
  },
}));
