import { supabase } from './supabase';

export interface PageParams {
  page: number;            // 1-based
  perPage: number;
  search?: string;         // texto a buscar
  searchColumns?: string[]; // columnas sobre las que aplicar ilike
  orderBy?: string;
  ascending?: boolean;
}

export interface PageResult<T> {
  rows: T[];
  total: number;           // total de filas que cumplen el filtro (no solo la página)
  totalPages: number;
}

/**
 * Trae UNA página desde Supabase usando paginación del lado del servidor:
 * `range()` para limitar filas + `count: 'exact'` para el total + `ilike` para búsqueda.
 * Evita cargar tablas completas al cliente (escala a miles de filas).
 *
 * @param table  nombre de la tabla
 * @param select columnas/relaciones (igual que en .select())
 */
export async function fetchPage<T = any>(
  table: string,
  params: PageParams,
  select = '*',
): Promise<PageResult<T>> {
  const { page, perPage, search, searchColumns = [], orderBy, ascending = true } = params;

  const from = (Math.max(1, page) - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase.from(table).select(select, { count: 'exact' }).range(from, to);

  if (orderBy) query = query.order(orderBy, { ascending });

  // Búsqueda case-insensitive en varias columnas (OR de ilike).
  if (search && search.trim() && searchColumns.length > 0) {
    const term = `%${search.trim()}%`;
    const orExpr = searchColumns.map((c) => `${c}.ilike.${term}`).join(',');
    query = query.or(orExpr);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: (data as T[]) ?? [],
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}
