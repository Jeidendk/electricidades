import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDisponibilidad, minutosHora } from './disponibilidadEspacios.ts';

const espacio = { id: 'aula-1', estado: 'disponible' };
const jornada = { inicio: 420, fin: 1140 };
const clase = (inicio: string, fin: string, dia = 'Miércoles', id = 'aula-1') =>
  ({ id_espacio: id, dia, hora_inicio: inicio, hora_fin: fin });
const consultar = (clases: ReturnType<typeof clase>[], inicio = 540, fin = 600, estado = 'disponible', edificio: string | undefined = 'operativo') =>
  calcularDisponibilidad({ ...espacio, estado }, edificio, clases, 'miercoles', jornada, { inicio, fin });

test('sin clases está libre toda la jornada', () => {
  assert.deepEqual(consultar([]).libres, [jornada]);
  assert.equal(consultar([]).libre, true);
});
test('no confunde días ni aulas; normaliza tildes', () => {
  assert.equal(consultar([clase('09:00', '10:00', 'Lunes'), clase('09:00', '10:00', 'Miércoles', 'otra')]).libre, true);
  assert.equal(consultar([clase('09:00', '10:00')]).libre, false);
});
test('límites contiguos y solapamientos de minutos', () => {
  assert.equal(consultar([clase('07:00:00', '09:00:00'), clase('10:00', '11:00')]).libre, true);
  assert.equal(consultar([clase('09:59', '11:00')]).libre, false);
  assert.equal(consultar([clase('08:00', '09:01')]).libre, false);
});
test('fusiona clases superpuestas y contiguas sin huecos falsos', () => {
  const r = consultar([clase('10:00', '12:00'), clase('08:00', '10:00'), clase('09:00', '11:00')]);
  assert.deepEqual(r.libres, [{ inicio: 420, fin: 480 }, { inicio: 720, fin: 1140 }]);
});
test('recorta clases a la jornada y reconoce un día completamente ocupado', () => {
  assert.deepEqual(consultar([clase('06:00', '20:00')]).libres, []);
  assert.deepEqual(consultar([clase('05:00', '06:00'), clase('20:00', '21:00')]).libres, [jornada]);
});
test('requiere que toda la franja esté libre', () => {
  assert.equal(consultar([clase('10:00', '11:00')], 540, 720).libre, false);
});
test('bloquea espacios ocupados, en mantenimiento y edificios no operativos', () => {
  for (const estado of ['ocupada', 'mantenimiento', '']) assert.deepEqual(consultar([], 540, 600, estado).libres, []);
  assert.equal(consultar([], 540, 600, 'disponible', 'mantenimiento').libre, false);
  assert.equal(calcularDisponibilidad(espacio, undefined, [], 'Lunes', jornada, { inicio: 540, fin: 600 }).libre, false);
});
test('datos malformados y consultas inválidas nunca dan disponibilidad', () => {
  assert.equal(consultar([clase('incorrecto', '10:00')]).libre, false);
  assert.equal(consultar([clase('11:00', '10:00')]).libre, false);
  for (const [inicio, fin] of [[600, 600], [600, 540], [400, 500], [1100, 1200], [NaN, 600]]) {
    assert.equal(consultar([], inicio, fin).libre, false);
  }
  assert.ok(Number.isNaN(minutosHora('25:00')));
  assert.ok(Number.isNaN(minutosHora('09:75')));
});
