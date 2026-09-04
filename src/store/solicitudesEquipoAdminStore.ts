import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { hoy } from '../lib/utils';
import { componerNombreCompleto } from '../lib/texto';

// Ítem dentro de una solicitud de equipo (lo que el estudiante pidió).
export interface SolEquipoItem {
  id_equipo?: string;  // id del catálogo -> equipo_id del préstamo
  nombre: string;
  serie?: string;
  categoria?: string;
  cantidad: number;
}

// Solicitud de equipo vista por el admin (con datos del estudiante).
export interface SolEquipoAdmin {
  id: number;
  numero: string;
  id_usuario: string | null;
  estudiante: string;
  fecha: string;
  hora: string;
  estado: string;
  items: SolEquipoItem[];
  observacion: string | null;
}

interface State {
  solicitudes: SolEquipoAdmin[];
  loading: boolean;
  error: string | null;
  fetchSolicitudes: () => Promise<void>;
  aprobar: (sol: SolEquipoAdmin, diasPrestamo?: number) => Promise<void>;
  rechazar: (id: number) => Promise<void>;
}

// Suma N días a una fecha YYYY-MM-DD.
const addDias = (base: string, dias: number): string => {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

export const useSolicitudesEquipoAdminStore = create<State>()((set, get) => ({
  solicitudes: [],
  loading: false,
  error: null,

  fetchSolicitudes: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('solicitudes_equipo')
        .select('*, usuarios(nombre, apellido, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped: SolEquipoAdmin[] = (data as any[] || []).map((d) => ({
        id: d.id,
        numero: d.numero,
        id_usuario: d.id_usuario,
        estudiante: componerNombreCompleto(d.usuarios?.nombre, d.usuarios?.apellido) || 'Estudiante',
        fecha: d.fecha,
        hora: d.hora,
        estado: d.estado,
        items: Array.isArray(d.items) ? d.items : [],
        observacion: d.observacion,
      }));
      set({ solicitudes: mapped });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  // Aprobar: crea un préstamo por cada ítem y marca la solicitud como Aprobada.
  aprobar: async (sol, diasPrestamo = 7) => {
    try {
      const fechaPrestamo = hoy();
      const fechaDev = addDias(fechaPrestamo, diasPrestamo);

      const baseId = Date.now();
      const prestamos = (sol.items.length ? sol.items : [{ nombre: 'Equipo', cantidad: 1 } as SolEquipoItem]).map((it, idx) => ({
        id: `PRST${baseId}-${idx}`,
        id_usuario_estudiante: sol.id_usuario,
        estudiante_nombre: sol.estudiante,
        equipo_id: it.id_equipo || it.serie || it.nombre,
        equipo_nombre: it.nombre,
        cantidad: it.cantidad || 1,
        fecha_prestamo: fechaPrestamo,
        fecha_devolucion_esperada: fechaDev,
        estado: 'activo',
        observaciones: `Generado de solicitud ${sol.numero}`,
      }));

      const { error: pErr } = await supabase.from('prestamos').insert(prestamos);
      if (pErr) throw pErr;

      const { error: sErr } = await supabase
        .from('solicitudes_equipo')
        .update({ estado: 'Aprobada' })
        .eq('id', sol.id);
      if (sErr) throw sErr;

      set({ solicitudes: get().solicitudes.map((s) => (s.id === sol.id ? { ...s, estado: 'Aprobada' } : s)) });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  rechazar: async (id) => {
    try {
      const { error } = await supabase.from('solicitudes_equipo').update({ estado: 'Rechazada' }).eq('id', id);
      if (error) throw error;
      set({ solicitudes: get().solicitudes.map((s) => (s.id === id ? { ...s, estado: 'Rechazada' } : s)) });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },
}));
