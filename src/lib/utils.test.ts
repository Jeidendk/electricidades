import { describe, it, expect } from 'vitest';
import { getInitials, nextId } from './utils';

describe('getInitials', () => {
  it('toma iniciales de nombre y apellido', () => {
    expect(getInitials('José Allauca')).toBe('JA');
  });
  it('ignora espacios extra y usa las dos primeras palabras', () => {
    expect(getInitials('  María  Fernanda  López ')).toBe('MF');
  });
  it('con un solo nombre usa sus dos primeras letras', () => {
    expect(getInitials('Madonna')).toBe('MA');
  });
  it('devuelve ? si está vacío o nulo', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
  });
});

describe('nextId', () => {
  it('genera el siguiente id con prefijo y padding', () => {
    expect(nextId([{ id: 'OT001' }, { id: 'OT003' }], 'OT')).toBe('OT004');
  });
  it('arranca en 001 cuando no hay items del prefijo', () => {
    expect(nextId([{ id: 'EQ005' }], 'OT')).toBe('OT001');
  });
});
