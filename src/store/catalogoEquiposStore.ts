import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { debeRecargar, type OpcionesFetch } from '../lib/frescura';
import type { Database } from '../lib/database.types';

type CatalogoEquiposRow = Database['public']['Tables']['catalogo_equipos']['Row'];
type InventarioRow = Database['public']['Tables']['inventario']['Row'];
type EspacioRow = Database['public']['Tables']['espacios']['Row'];
type EdificioRow = Database['public']['Tables']['edificios']['Row'];

/**
 * El inventario guarda una fila por unidad física. El catálogo estudiantil muestra esas unidades
 * agrupadas por artículo y ubicación para ofrecer una cantidad disponible que se pueda solicitar.
 */
const construirCatalogoDesdeInventario = (
  inventario: InventarioRow[],
  espacios: EspacioRow[],
  edificios: EdificioRow[],
): CatalogoEquiposRow[] => {
  const espacioPorId = new Map(espacios.map(espacio => [espacio.id, espacio]));
  const edificioPorId = new Map(edificios.map(edificio => [edificio.id, edificio]));
  const grupos = new Map<string, InventarioRow[]>();

  for (const unidad of inventario) {
    const clave = [
      unidad.nombre.trim().toLocaleLowerCase('es'),
      unidad.categoria,
      unidad.id_espacio || '',
    ].join('|');
    grupos.set(clave, [...(grupos.get(clave) || []), unidad]);
  }

  return [...grupos.values()].map(unidades => {
    const primera = unidades[0];
    const espacio = primera.id_espacio ? espacioPorId.get(primera.id_espacio) : undefined;
    const edificio = espacio ? edificioPorId.get(espacio.id_edificio) : undefined;
    const fotos = unidades.find(unidad => Array.isArray(unidad.fotos_json) && unidad.fotos_json.length)?.fotos_json
      ?? primera.fotos_json;
    const disponibles = unidades.filter(unidad => unidad.estado === 'bueno').length;
    const series = [...new Set(unidades.map(unidad => unidad.serie).filter(Boolean))];

    return {
      id: primera.id,
      serie: series.length > 1 ? `${series[0]} +${series.length - 1}` : (series[0] || primera.serie),
      nombre: primera.nombre,
      categoria: primera.categoria,
      stock: disponibles,
      stock_total: unidades.length,
      estado: disponibles > 0 ? 'disponible' : 'agotado',
      fotos_json: fotos,
      ubicacion: [espacio?.nombre, edificio?.nombre].filter(Boolean).join(' · ') || 'Sin ubicación',
      created_at: primera.created_at,
      updated_at: unidades.reduce((ultima, unidad) => unidad.updated_at > ultima ? unidad.updated_at : ultima, primera.updated_at),
    };
  });
};

interface CatalogoEquiposState {
  items: CatalogoEquiposRow[];
  loading: boolean;
  error: string | null;
  /** Momento de la última carga correcta; null si nunca se cargó. */
  ultimaCarga: number | null;
  fetchItems: (opciones?: OpcionesFetch) => Promise<void>;
}

export const useCatalogoEquiposStore = create<CatalogoEquiposState>()((set, get) => ({
  items: [],
  loading: false,
  error: null,
  ultimaCarga: null,

  fetchItems: async (opciones) => {
    if (!debeRecargar(get().ultimaCarga, opciones)) return;

    set({ loading: true, error: null });
    try {
      const [inventarioResult, espaciosResult, edificiosResult] = await Promise.all([
        supabase.from('inventario').select('*'),
        supabase.from('espacios').select('*'),
        supabase.from('edificios').select('*'),
      ]);

      if (inventarioResult.error) throw inventarioResult.error;
      if (espaciosResult.error) throw espaciosResult.error;
      if (edificiosResult.error) throw edificiosResult.error;

      const items = construirCatalogoDesdeInventario(
        inventarioResult.data || [],
        espaciosResult.data || [],
        edificiosResult.data || [],
      );
      set({ items, loading: false, ultimaCarga: Date.now() });
    } catch (err: any) {
      console.error('Error construyendo el catálogo desde inventario:', err);
      set({ error: err.message, loading: false });
    }
  },
}));
