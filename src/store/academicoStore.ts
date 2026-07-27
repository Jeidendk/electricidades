import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { materiasData, type Materia } from '../modules/admin/data/academicoData';

interface AcademicoState {
  materias: Materia[];
  addMateria: (data: Omit<Materia, 'id'>) => void;
  updateMateria: (id: string, patch: Partial<Materia>) => void;
  removeMateria: (id: string) => void;
  toggleRecurso: (materiaId: string, recursoId: number) => void;
}

export const useAcademicoStore = create<AcademicoState>()(
  persist(
    (set) => ({
      materias: materiasData,

      addMateria: (data) =>
        set((s) => ({
          materias: [
            ...s.materias,
            { ...data, id: `MAT${Date.now()}` },
          ],
        })),

      updateMateria: (id, patch) =>
        set((s) => ({
          materias: s.materias.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        })),

      removeMateria: (id) =>
        set((s) => ({
          materias: s.materias.filter((m) => m.id !== id),
        })),

      toggleRecurso: (materiaId, recursoId) =>
        set((s) => ({
          materias: s.materias.map((m) => {
            if (m.id !== materiaId) return m;
            const ids = m.recursosIds.includes(recursoId)
              ? m.recursosIds.filter((r) => r !== recursoId)
              : [...m.recursosIds, recursoId];
            return { ...m, recursosIds: ids };
          }),
        })),
    }),
    {
      name: 'academico-storage-v2',
    }
  )
);
