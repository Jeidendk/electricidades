/**
 * Préstamos de equipos.
 *
 * Una fila = **una unidad física** desde la migración 0043. Las reservas (`reservado`) y las
 * entregas (`activo`) las crea el servidor al aprobar una solicitud; aquí quedan la lectura, la
 * devolución —que también es una función transaccional— y el alta manual de mostrador, que el
 * personal usa cuando no hubo solicitud previa.
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { debeRecargar, type OpcionesFetch } from '../lib/frescura';
import type { Database } from '../lib/database.types';
import { notifyStoreError } from '../lib/notifyError';
import type { CondicionDevolucion } from '../modules/admin/data/flujoPrestamos';

type PrestamoRow = Database['public']['Tables']['prestamos']['Row'];
type PrestamoInsert = Database['public']['Tables']['prestamos']['Insert'];
type PrestamoUpdate = Database['public']['Tables']['prestamos']['Update'];

/** Préstamo con la serie de la unidad y el número de la solicitud, para poder rastrearlo. */
export interface PrestamoConOrigen extends PrestamoRow {
  serieUnidad: string | null;
  numeroSolicitud: string | null;
}

interface PrestamosState {
  prestamos: PrestamoConOrigen[];
  loading: boolean;
  error: string | null;
  /** Momento de la última carga correcta; null si nunca se cargó. */
  ultimaCarga: number | null;
  fetchPrestamos: (opciones?: OpcionesFetch) => Promise<void>;
  addPrestamo: (data: PrestamoInsert) => Promise<void>;
  updatePrestamo: (id: string, patch: PrestamoUpdate) => Promise<void>;
  removePrestamo: (id: string) => Promise<void>;
  /** Devolución de una unidad. Varias llamadas = devolución parcial de la solicitud. */
  devolver: (id: string, condicion: CondicionDevolucion, observaciones?: string) => Promise<void>;
}

const mapear = (fila: any): PrestamoConOrigen => ({
  ...fila,
  serieUnidad: fila.inventario?.serie ?? null,
  numeroSolicitud: fila.solicitud?.numero ?? null,
});

export const usePrestamosStore = create<PrestamosState>((set, get) => ({
  prestamos: [],
  loading: false,
  error: null,
  ultimaCarga: null,

  fetchPrestamos: async (opciones) => {
    if (!debeRecargar(get().ultimaCarga, opciones)) return;

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('prestamos')
        .select(`
          *,
          inventario:id_inventario (serie),
          solicitud:id_solicitud (numero)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ prestamos: (data as any[] || []).map(mapear), ultimaCarga: Date.now() });
    } catch (err: any) {
      // La lista anterior se conserva: una consulta fallida no significa que no haya préstamos.
      set({ error: err?.message || 'No se pudieron cargar los préstamos.' });
    } finally {
      set({ loading: false });
    }
  },

  addPrestamo: async (data) => {
    const { data: creado, error } = await supabase
      .from('prestamos')
      .insert([data])
      .select(`*, inventario:id_inventario (serie), solicitud:id_solicitud (numero)`)
      .single();

    if (error) throw error;
    if (creado) set((estado) => ({ prestamos: [mapear(creado), ...estado.prestamos] }));
  },

  updatePrestamo: async (id, patch) => {
    try {
      const { data, error } = await supabase
        .from('prestamos')
        .update(patch)
        .eq('id', id)
        .select(`*, inventario:id_inventario (serie), solicitud:id_solicitud (numero)`)
        .single();

      if (error) throw error;
      if (data) {
        set((estado) => ({
          prestamos: estado.prestamos.map(p => (p.id === id ? mapear(data) : p)),
        }));
      }
    } catch (err: any) {
      notifyStoreError('Error updating prestamo:', err);
      throw err;
    }
  },

  removePrestamo: async (id) => {
    try {
      const { error } = await supabase.from('prestamos').delete().eq('id', id);
      if (error) throw error;
      set((estado) => ({ prestamos: estado.prestamos.filter(p => p.id !== id) }));
    } catch (err: any) {
      notifyStoreError('Error removing prestamo:', err);
      throw err;
    }
  },

  devolver: async (id, condicion, observaciones) => {
    // La función cierra la solicitud cuando ya no le queda ninguna unidad fuera y corrige el
    // estado físico si el equipo volvió dañado: releer es más barato que reproducir eso aquí.
    const { error } = await supabase.rpc('devolver_prestamo' as never, {
      p_id: id,
      p_condicion: condicion,
      p_observaciones: observaciones ?? null,
    } as never);
    if (error) throw error;
    await get().fetchPrestamos({ forzar: true });
  },
}));
