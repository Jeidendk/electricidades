import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface HorarioEstudianteItem {
  id: string;
  materia: string;
  docente: string;
  aula: string;
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
  fetchHorarioAuto: (carreraId: string, pao: number) => Promise<void>;
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

  fetchHorario: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('horario_estudiante')
        .select(`
          id,
          clases (
            id, dia, hora_inicio, hora_fin,
            materias ( nombre ),
            usuarios ( nombre ),
            espacios ( nombre, tipo )
          )
        `)
        .eq('id_usuario', userId)
        .eq('estado_inscripcion', 'inscrito');

      if (error) throw error;

      const formatted = (data as any[]).map(d => {
        const c = d.clases;
        let tipo: 'normal' | 'laboratorio' | 'tutoría' = 'normal';
        if (c?.espacios?.tipo === 'Laboratorio') tipo = 'laboratorio';
        
        return {
          id: d.id,
          materia: c?.materias?.nombre || 'Desconocida',
          docente: c?.usuarios?.nombre || 'Desconocido',
          aula: c?.espacios?.nombre || 'Sin aula',
          dia: c?.dia || 'LUN',
          horaInicio: c?.hora_inicio?.substring(0, 5) || '00:00',
          horaFin: c?.hora_fin?.substring(0, 5) || '00:00',
          tipo,
          color: '#2563eb' // default color or fetch from somewhere
        };
      });

      set({ items: formatted, loading: false });
    } catch (err: any) {
      console.error('Error fetching horario:', err);
      set({ error: err.message, loading: false });
    }
  },

  // Horario AUTOMÁTICO: deriva las clases de la carrera + PAO del estudiante,
  // sin requerir inscripción manual. Trae materia, docente, aula, día y horas.
  fetchHorarioAuto: async (carreraId: string, pao: number) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('clases')
        .select(`
          id, dia, hora_inicio, hora_fin, id_docente,
          materias!inner ( nombre, id_carrera, semestre ),
          espacios ( nombre, tipo )
        `)
        .eq('materias.id_carrera', carreraId)
        .eq('materias.semestre', pao);

      if (error) throw error;

      // Nombres de docentes vía la vista `docentes` (la RLS de usuarios bloquea el join directo).
      const docenteIds = [...new Set((data as any[]).map(c => c.id_docente).filter(Boolean))];
      const docenteMap: Record<string, string> = {};
      if (docenteIds.length) {
        const { data: docs } = await supabase.from('docentes').select('id, nombre').in('id', docenteIds);
        (docs as any[] || []).forEach(d => { docenteMap[d.id] = d.nombre; });
      }

      const formatted = (data as any[]).map((c) => {
        const materia = c.materias?.nombre || 'Desconocida';
        const tipo: 'normal' | 'laboratorio' | 'tutoría' = c.espacios?.tipo === 'Laboratorio' ? 'laboratorio' : 'normal';
        return {
          id: c.id,
          materia,
          docente: docenteMap[c.id_docente] || 'Docente por asignar',
          aula: c.espacios?.nombre || 'Sin aula',
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
