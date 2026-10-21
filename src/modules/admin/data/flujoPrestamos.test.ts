/**
 * Pruebas del recorrido de préstamos.
 *
 * Ejecutar:  node --experimental-strip-types --test src/modules/admin/data/flujoPrestamos.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  esAtrasado,
  ocupaUnidad,
  puedeAprobarse,
  puedeCancelarlaElEstudiante,
  puedeCancelarlaElPersonal,
  puedeEntregarse,
  resumirPrestamos,
  sumarDias,
  unidadesDisponibles,
} from './flujoPrestamos.ts';

const HOY = '2026-09-29';

test('una reserva sin entregar no está atrasada aunque venza la fecha', () => {
  const reservado = { estado: 'reservado', fecha_devolucion_esperada: '2026-09-01' };
  assert.equal(esAtrasado(reservado, HOY), false);
});

test('un préstamo entregado y vencido está atrasado; devuelto, nunca', () => {
  assert.equal(esAtrasado({ estado: 'activo', fecha_devolucion_esperada: '2026-09-28' }, HOY), true);
  assert.equal(esAtrasado({ estado: 'activo', fecha_devolucion_esperada: '2026-09-29' }, HOY), false);
  assert.equal(esAtrasado({ estado: 'devuelto', fecha_devolucion_esperada: '2026-01-01' }, HOY), false);
});

test('solo reservado y activo retienen la unidad', () => {
  assert.equal(ocupaUnidad('reservado'), true);
  assert.equal(ocupaUnidad('activo'), true);
  assert.equal(ocupaUnidad('devuelto'), false);
  assert.equal(ocupaUnidad('cancelado'), false);
});

test('una unidad en buen estado pero prestada no está disponible', () => {
  const unidades = [
    { id: 'INV-1', estado: 'bueno' },
    { id: 'INV-2', estado: 'bueno' },
    { id: 'INV-3', estado: 'dañado' },
  ];
  assert.equal(unidadesDisponibles(unidades, new Set()), 2);
  assert.equal(unidadesDisponibles(unidades, new Set(['INV-1'])), 1);
  // Una unidad dañada ya no contaba: marcarla ocupada no la descuenta dos veces.
  assert.equal(unidadesDisponibles(unidades, new Set(['INV-3'])), 2);
});

test('el resumen no cuenta dos veces un préstamo atrasado', () => {
  const resumen = resumirPrestamos([
    { estado: 'reservado', fecha_devolucion_esperada: '2026-10-06' },
    { estado: 'activo', fecha_devolucion_esperada: '2026-10-06' },
    { estado: 'activo', fecha_devolucion_esperada: '2026-09-01' },
    { estado: 'devuelto', fecha_devolucion_esperada: '2026-09-01' },
    { estado: 'cancelado', fecha_devolucion_esperada: '2026-09-01' },
  ], HOY);

  assert.deepEqual(resumen, { reservados: 1, activos: 1, atrasados: 1, devueltos: 1 });
});

test('las transiciones permitidas dependen del estado de la solicitud', () => {
  assert.equal(puedeAprobarse('Pendiente'), true);
  assert.equal(puedeAprobarse('Aprobada'), false);

  assert.equal(puedeEntregarse('Aprobada'), true);
  assert.equal(puedeEntregarse('Pendiente'), false);

  assert.equal(puedeCancelarlaElEstudiante('Pendiente'), true);
  assert.equal(puedeCancelarlaElEstudiante('Aprobada'), false);

  assert.equal(puedeCancelarlaElPersonal('Aprobada'), true);
  assert.equal(puedeCancelarlaElPersonal('Entregada'), false);
});

test('sumarDias cruza fin de mes sin corrimiento', () => {
  assert.equal(sumarDias('2026-09-29', 7), '2026-10-06');
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01');
});
