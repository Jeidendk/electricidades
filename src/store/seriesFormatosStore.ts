import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { notifyStoreError } from '../lib/notifyError';

/**
 * Serie documental: el cuadro de clasificación de los formatos.
 * Una serie con `idPadre` es una subserie.
 */
export interface SerieFormato {
  id: string;
  nombre: string;
  descripcion: string | null;
  idPadre: string | null;
  orden: number;
  codigo?: string | null;
  publico: 'estudiantes' | 'docentes' | 'gestion' | null;
}

/** Una serie con sus subseries ya colgadas, que es como la dibuja el árbol. */
export interface SerieConHijas extends SerieFormato {
  hijas: SerieConHijas[];
}

interface SeriesFormatosState {
  series: SerieFormato[];
  loading: boolean;
  error: string | null;
  fetchSeries: () => Promise<void>;
  addSerie: (nombre: string, idPadre: string | null, publico: SerieFormato['publico']) => Promise<void>;
  renameSerie: (id: string, nombre: string) => Promise<void>;
  removeSerie: (id: string) => Promise<void>;
}

const desdeFila = (fila: any): SerieFormato => ({
  id: fila.id,
  nombre: fila.nombre,
  descripcion: fila.descripcion ?? null,
  idPadre: fila.id_padre ?? null,
  orden: fila.orden ?? 0,
  codigo: fila.codigo ?? null,
  publico: fila.publico ?? null,
});

const porOrden = (a: SerieFormato, b: SerieFormato) =>
  a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es');

/**
 * Arma el árbol a partir de la lista plana.
 *
 * Una serie cuyo padre no esté en la lista se trata como de primer nivel: si se dejara fuera,
 * desaparecería de la pantalla sin que nadie pudiera recuperarla.
 */
export const construirArbol = (series: SerieFormato[]): SerieConHijas[] => {
  const nodos = new Map<string, SerieConHijas>(
    series.map(serie => [serie.id, { ...serie, hijas: [] }]),
  );
  const raices: SerieConHijas[] = [];

  for (const nodo of nodos.values()) {
    const padre = nodo.idPadre ? nodos.get(nodo.idPadre) : undefined;
    if (padre) padre.hijas.push(nodo);
    else raices.push(nodo);
  }

  const ordenar = (lista: SerieConHijas[]) => {
    lista.sort(porOrden);
    for (const nodo of lista) ordenar(nodo.hijas);
  };
  ordenar(raices);
  return raices;
};

/** Ids de una serie y de todo lo que cuelga de ella. Para contar y para filtrar. */
export const idsConDescendientes = (serie: SerieConHijas): string[] =>
  [serie.id, ...serie.hijas.flatMap(idsConDescendientes)];

/** Camino desde la raíz hasta la serie indicada, para el rastro de navegación. */
export const rutaHasta = (series: SerieFormato[], id: string | null): SerieFormato[] => {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const camino: SerieFormato[] = [];
  let actual = id ? porId.get(id) : undefined;
  // El tope corta cualquier ciclo que se hubiera colado: el trigger de la base lo impide,
  // pero colgar el navegador por un dato malo no es una opción.
  while (actual && camino.length < 50) {
    camino.unshift(actual);
    actual = actual.idPadre ? porId.get(actual.idPadre) : undefined;
  }
  return camino;
};

export const useSeriesFormatosStore = create<SeriesFormatosState>()((set) => ({
  series: [],
  loading: false,
  error: null,

  fetchSeries: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('series_formatos')
        .select('*')
        .order('orden')
        .order('nombre');
      if (error) throw error;
      set({ series: ((data as any[]) || []).map(desdeFila) });
    } catch (err: any) {
      set({ error: err.message || 'No se pudieron cargar las categorías.' });
      notifyStoreError('No se pudieron cargar las categorías:', err);
    } finally {
      set({ loading: false });
    }
  },

  addSerie: async (nombre, idPadre, publico) => {
    try {
      const { data, error } = await supabase
        .from('series_formatos')
        .insert([{ nombre: nombre.trim(), id_padre: idPadre, publico }])
        .select('*')
        .single();
      if (error) throw error;
      if (data) set((s) => ({ series: [...s.series, desdeFila(data)].sort(porOrden) }));
    } catch (err: any) {
      notifyStoreError('No se pudo crear la categoría:', err);
      throw err;
    }
  },

  renameSerie: async (id, nombre) => {
    try {
      const { data, error } = await supabase
        .from('series_formatos')
        .update({ nombre: nombre.trim() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      if (data) set((s) => ({ series: s.series.map(x => (x.id === id ? desdeFila(data) : x)) }));
    } catch (err: any) {
      notifyStoreError('No se pudo renombrar la categoría:', err);
      throw err;
    }
  },

  /**
   * Borra la serie. La base lo rechaza si tiene subseries (`on delete restrict`); los formatos
   * que contenga NO se borran, quedan sin clasificar (`on delete set null`).
   */
  removeSerie: async (id) => {
    try {
      const { error } = await supabase.from('series_formatos').delete().eq('id', id);
      if (error) throw error;
      set((s) => ({ series: s.series.filter(x => x.id !== id) }));
    } catch (err: any) {
      notifyStoreError('No se pudo eliminar la categoría:', err);
      throw err;
    }
  },
}));
