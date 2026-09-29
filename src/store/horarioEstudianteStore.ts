import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { componerNombreCompleto } from '../lib/texto';
// El enum `tipo_espacio` no tiene ninguna etiqueta que sea exactamente 'Laboratorio':
// son 'Laboratorio Técnico' y 'Laboratorio de Informática', así que comparar con === daba
// siempre 'normal' y ninguna clase se marcaba como laboratorio.
import { esLaboratorio } from '../modules/admin/data/espaciosData';

export interface HorarioEstudianteItem {
  id: string;
  materia: string;
  docente: string;
  aula: string;
  aulaId: string | null;
  edificio: string;
  paralelo: number | null;
  dia: string;
  horaInicio: string;
  horaFin: string;
  tipo: 'normal' | 'laboratorio' | 'tutoría';
  color: string;
}

interface HorarioEstudianteState {
  items: HorarioEstudianteItem[];
  loading: boolean;
  error: string | null;
  fetchHorario: (userId: string) => Promise<void>;
  fetchHorarioAuto: (carreraId: string, pao: number, paralelo: number) => Promise<void>;
  clearHorario: () => void;
}

// Paleta para colorear materias de forma estable.
const PALETTE = ['#2563eb', '#9333ea', '#0891b2', '#e11d48', '#16a34a', '#d97706', '#7c3aed', '#0d9488'];
const colorPorMateria = (nombre: string) => {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

export const useHorarioEstudianteStore = create<HorarioEstudianteState>()((set) => ({
  items: [],
  loading: false,
  error: null,
  clearHorario: () => set({ items: [], loading: false, error: null }),

  fetchHorario: async (userId: string) => {
    set({ items: [], loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('horario_estudiante')
        .select(`
          id,
          clases (
            id, dia, hora_inicio, hora_fin, paralelo,
            materias ( nombre ),
            docentes:usuarios!clases_id_docente_fkey ( nombre, apellido, titulo ),
            espacios ( id, nombre, tipo, edificios ( nombre ) )
          )
        `)
        .eq('id_usuario', userId)
        .eq('estado_inscripcion', 'inscrito');

      if (error) throw error;

      const formatted = (data as any[]).map(d => {
        const c = d.clases;
        let tipo: 'normal' | 'laboratorio' | 'tutoría' = 'normal';
        if (esLaboratorio(c?.espacios?.tipo)) tipo = 'laboratorio';
        
        return {
          id: d.id,
          materia: c?.materias?.nombre || 'Desconocida',
          docente: [c?.docentes?.titulo, componerNombreCompleto(c?.docentes?.nombre, c?.docentes?.apellido)].filter(Boolean).join(' ') || 'Docente por asignar',
          aula: c?.espacios?.nombre || 'Sin aula',
          aulaId: c?.espacios?.id || null,
          edificio: c?.espacios?.edificios?.nombre || 'Sin edificio',
          paralelo: c?.paralelo ?? null,
          dia: c?.dia || 'LUN',
          horaInicio: c?.hora_inicio?.substring(0, 5) || '00:00',
          horaFin: c?.hora_fin?.substring(0, 5) || '00:00',
          tipo,
          color: colorPorMateria(c?.materias?.nombre || ''),
        };
      });

      set({ items: formatted, loading: false });
    } catch (err: any) {
      console.error('Error fetching horario:', err);
      set({ error: err.message, loading: false });
    }
  },

  // Horario AUTOMÁTICO: deriva las clases de la carrera + PAO + paralelo del estudiante,
  // sin requerir inscripción manual. Trae materia, docente, aula, día y horas.
  fetchHorarioAuto: async (carreraId: string, pao: number, paralelo: number) => {
    set({ items: [], loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('clases')
        .select(`
          id, dia, hora_inicio, hora_fin, paralelo,
          materias!inner ( nombre, id_carrera, semestre ),
          docentes:usuarios!clases_id_docente_fkey ( nombre, apellido, titulo ),
          espacios ( id, nombre, tipo, edificios ( nombre ) )
        `)
        .eq('materias.id_carrera', carreraId)
        .eq('materias.semestre', pao)
        .eq('paralelo', paralelo);

      if (error) throw error;

      const formatted = (data as any[]).map((c) => {
        const materia = c.materias?.nombre || 'Desconocida';
        const tipo: 'normal' | 'laboratorio' | 'tutoría' = esLaboratorio(c.espacios?.tipo) ? 'laboratorio' : 'normal';
        return {
          id: c.id,
          materia,
          docente: [c.docentes?.titulo, componerNombreCompleto(c.docentes?.nombre, c.docentes?.apellido)].filter(Boolean).join(' ') || 'Docente por asignar',
          aula: c.espacios?.nombre || 'Sin aula',
          aulaId: c.espacios?.id || null,
          edificio: c.espacios?.edificios?.nombre || 'Sin edificio',
          paralelo: c.paralelo ?? null,
          dia: c.dia || 'Lunes',
          horaInicio: c.hora_inicio?.substring(0, 5) || '00:00',
          horaFin: c.hora_fin?.substring(0, 5) || '00:00',
          tipo,
          color: colorPorMateria(materia),
        };
      });

      set({ items: formatted, loading: false });
    } catch (err: any) {
      console.error('Error fetching horario auto:', err);
      set({ error: err.message, loading: false });
    }
  },
}));
