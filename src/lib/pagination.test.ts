import { describe, it, expect, beforeEach, vi } from 'vitest';

// Captura los argumentos pasados a la cadena de Supabase para verificar
// que la paginación usa range()/or() correctamente.
const calls: { range?: [number, number]; or?: string; order?: string } = {};
const mockResult = { data: [{ id: '1' }, { id: '2' }], count: 42, error: null };

vi.mock('./supabase', () => {
  const chain: any = {};
  chain.select = () => chain;
  chain.range = (a: number, b: number) => { calls.range = [a, b]; return chain; };
  chain.order = (c: string) => { calls.order = c; return chain; };
  chain.or = (e: string) => { calls.or = e; return chain; };
  chain.then = (resolve: any) => resolve(mockResult);
  return { supabase: { from: () => chain } };
});

import { fetchPage } from './pagination';

describe('fetchPage (paginación server-side)', () => {
  beforeEach(() => { calls.range = undefined; calls.or = undefined; calls.order = undefined; });

  it('calcula el range a partir de page/perPage (1-based)', async () => {
    await fetchPage('usuarios', { page: 3, perPage: 10 });
    expect(calls.range).toEqual([20, 29]);
  });

  it('devuelve total y totalPages desde el count', async () => {
    const res = await fetchPage('usuarios', { page: 1, perPage: 10 });
    expect(res.total).toBe(42);
    expect(res.totalPages).toBe(5);
    expect(res.rows).toHaveLength(2);
  });

  it('arma el OR de ilike cuando hay búsqueda', async () => {
    await fetchPage('usuarios', { page: 1, perPage: 10, search: 'jose', searchColumns: ['nombre', 'email'] });
    expect(calls.or).toBe('nombre.ilike.%jose%,email.ilike.%jose%');
  });

  it('no aplica búsqueda si no hay columnas', async () => {
    await fetchPage('usuarios', { page: 1, perPage: 10, search: 'jose' });
    expect(calls.or).toBeUndefined();
  });
});
