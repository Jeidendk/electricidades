import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { notifyStoreError } from '../lib/notifyError';
import { componerNombreCompleto } from '../lib/texto';

/** Una entrada del historial: qué se generó y quién lo pidió. */
export interface Reporte {
  id: string;
  tipo: string;
  formato: string;
  filas: number;
  created_at: string;
  generado_por: string | null;
  /** Nombre resuelto de quien lo generó; null si esa cuenta ya no existe. */
  generadoPorNombre: string | null;
}

interface NuevoReporte {
  tipo: string;
  formato: string;
  filtros?: Record<string, unknown>;
  filas: number;
}

interface ReportesState {
  reportes: Reporte[];
  loading: boolean;
  fetchReportes: () => Promise<void>;
  registrarReporte: (datos: NuevoReporte) => Promise<void>;
}

/** Cuántas entradas del historial se traen; es una bitácora, no un archivo a paginar. */
const LIMITE_HISTORIAL = 50;

export const useReportesStore = create<ReportesState>()((set) => ({
  reportes: [],
  loading: false,

  fetchReportes: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('reportes')
        .select('id, tipo, formato, filas, created_at, generado_por, usuarios(nombre, apellido)')
        .order('created_at', { ascending: false })
        .limit(LIMITE_HISTORIAL);
      if (error) throw error;

      set({
        reportes: ((data as any[]) || []).map(fila => ({
          id: fila.id,
          tipo: fila.tipo,
          formato: fila.formato,
          filas: fila.filas ?? 0,
          created_at: fila.created_at,
          generado_por: fila.generado_por,
          generadoPorNombre: componerNombreCompleto(fila.usuarios?.nombre, fila.usuarios?.apellido) || null,
        })),
      });
    } catch (error: any) {
      // El historial es informativo: si falla, la pantalla sigue sirviendo para generar.
      notifyStoreError('No se pudo cargar el historial de reportes:', error);
    } finally {
      set({ loading: false });
    }
  },

  registrarReporte: async ({ tipo, formato, filtros = {}, filas }) => {
    const { data: sesion } = await supabase.auth.getUser();
    const { error } = await supabase.from('reportes').insert([{
      tipo,
      formato,
      filtros,
      filas,
      generado_por: sesion.user?.id ?? null,
    }]);
    if (error) throw error;
  },
}));
