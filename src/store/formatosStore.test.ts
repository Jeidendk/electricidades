import { describe, it, expect, beforeEach, vi } from 'vitest';

// Estado mutable que el mock de Supabase usará para simular respuestas.
const mockState: { insertRow: any; deleteError: any } = { insertRow: null, deleteError: null };

vi.mock('../lib/supabase', () => {
  const makeChain = (table: string) => {
    const chain: any = {};
    chain.select = () => chain;
    chain.insert = () => chain;
    chain.update = () => chain;
    chain.delete = () => chain;
    chain.eq = () => Promise.resolve({ error: mockState.deleteError });
    chain.order = () => Promise.resolve({ data: [], error: null });
    chain.single = () => Promise.resolve({ data: mockState.insertRow, error: null });
    void table;
    return chain;
  };
  return { supabase: { from: (t: string) => makeChain(t) } };
});

import { useFormatosStore } from './formatosStore';

describe('formatosStore CRUD', () => {
  beforeEach(() => {
    useFormatosStore.setState({ formatos: [], loading: false, error: null });
    mockState.insertRow = null;
    mockState.deleteError = null;
  });

  it('addFormato antepone la fila creada al estado', async () => {
    mockState.insertRow = { id: 'FMT-1', nombre: 'Oficio X', tipo: 'DINAMICO', estado: 'activo', descripcion: '', datos: {}, created_at: '2026-06-28' };
    await useFormatosStore.getState().addFormato({ nombre: 'Oficio X' } as any);
    const { formatos } = useFormatosStore.getState();
    expect(formatos).toHaveLength(1);
    expect(formatos[0].nombre).toBe('Oficio X');
  });

  it('removeFormato elimina la fila del estado', async () => {
    useFormatosStore.setState({ formatos: [{ id: 'FMT-1' } as any, { id: 'FMT-2' } as any] });
    await useFormatosStore.getState().removeFormato('FMT-1');
    const { formatos } = useFormatosStore.getState();
    expect(formatos.map(f => f.id)).toEqual(['FMT-2']);
  });

  it('removeFormato lanza y no muta el estado si la BD devuelve error', async () => {
    mockState.deleteError = { message: 'permiso denegado' };
    useFormatosStore.setState({ formatos: [{ id: 'FMT-1' } as any] });
    // El store ahora re-lanza el error (además de notificar) para que el caller
    // no continúe como si la operación hubiera sido exitosa.
    await expect(useFormatosStore.getState().removeFormato('FMT-1')).rejects.toMatchObject({ message: 'permiso denegado' });
    expect(useFormatosStore.getState().formatos).toHaveLength(1);
  });
});
