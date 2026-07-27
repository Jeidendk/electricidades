import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import Swal from 'sweetalert2';

type AsignacionInsert = Database['public']['Tables']['asignaciones']['Insert'];

export type RecursoKind = 'item' | 'espacio' | 'edificio';
export const resKey = (kind: RecursoKind, id: string) => `${kind}:${id}`;

interface AsignacionesState {
  asignaciones: Record<string, string>; // Mantiene el formato local de clave-valor
  loading: boolean;
  error: string | null;
  fetchAsignaciones: () => Promise<void>;
  assign: (key: string, tecnicoId: string, idEspacio: string) => Promise<void>;
  assignMany: (keys: { key: string; idEspacio: string }[], tecnicoId: string) => Promise<void>;
  unassign: (key: string) => Promise<void>;
}

export const useAsignacionesStore = create<AsignacionesState>((set) => ({
  asignaciones: {},
  loading: false,
  error: null,

  fetchAsignaciones: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.from('asignaciones').select('*');
      if (error) throw error;
      
      const newAsignaciones: Record<string, string> = {};
      data?.forEach((a) => {
        // Asumiendo que guardamos el key compuesto en `descripcion` por conveniencia,
        // o si adaptamos la lógica para mapear id_espacio.
        // Simplificado:
        if (a.descripcion) {
           newAsignaciones[a.descripcion] = a.id_tecnico;
        }
      });
      set({ asignaciones: newAsignaciones });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  assign: async (key, tecnicoId, idEspacio) => {
    try {
      // Guardar en Supabase. Usamos 'descripcion' para almacenar el 'key' de Zustand.
      const payload: AsignacionInsert = {
        id: crypto.randomUUID(),
        id_espacio: idEspacio,
        id_tecnico: tecnicoId,
        fecha_desde: new Date().toISOString().split('T')[0],
        descripcion: key,
      };
      
      const { error } = await supabase.from('asignaciones').insert([payload]);
      if (error) throw error;
      
      set((state) => ({
        asignaciones: { ...state.asignaciones, [key]: tecnicoId }
      }));
    } catch (err: any) {
      console.error('Error assigning:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error de Asignación',
        text: err.message || 'No se pudo asignar el recurso.',
        confirmButtonColor: '#0f172a'
      });
    }
  },

  assignMany: async (keys, tecnicoId) => {
    try {
      const payloads: AsignacionInsert[] = keys.map(k => ({
        id: crypto.randomUUID(),
        id_espacio: k.idEspacio,
        id_tecnico: tecnicoId,
        fecha_desde: new Date().toISOString().split('T')[0],
        descripcion: k.key,
      }));
      
      const { error } = await supabase.from('asignaciones').insert(payloads);
      if (error) throw error;
      
      set((state) => {
        const next = { ...state.asignaciones };
        keys.forEach(k => { next[k.key] = tecnicoId; });
        return { asignaciones: next };
      });
    } catch (err: any) {
      console.error('Error assigning many:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error de Asignación',
        text: err.message || 'No se pudieron asignar los recursos.',
        confirmButtonColor: '#0f172a'
      });
    }
  },

  unassign: async (key) => {
    try {
      const { error } = await supabase
        .from('asignaciones')
        .delete()
        .eq('descripcion', key); // Usamos descripcion como key local
        
      if (error) throw error;
      
      set((state) => {
        const next = { ...state.asignaciones };
        delete next[key];
        return { asignaciones: next };
      });
    } catch (err: any) {
      console.error('Error unassigning:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error al desasignar',
        text: err.message || 'No se pudo quitar la asignación.',
        confirmButtonColor: '#0f172a'
      });
    }
  }
}));

