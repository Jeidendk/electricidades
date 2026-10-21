/**
 * Pruebas de las reglas del trámite académico.
 *
 * Ejecutar:  node --experimental-strip-types --test src/lib/tramitesAcademicos.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  decisionNecesitaObservaciones,
  esReenvio,
  puedeEditarloElEstudiante,
  puedeEnviarse,
  puedeRevisarlo,
  puedeRevisarse,
} from './tramitesAcademicos.ts';

test('el estudiante edita su borrador y lo devuelto para corregir, nada más', () => {
  assert.equal(puedeEditarloElEstudiante('borrador'), true);
  assert.equal(puedeEditarloElEstudiante('cambios_solicitados'), true);
  assert.equal(puedeEditarloElEstudiante('pendiente'), false);
  assert.equal(puedeEditarloElEstudiante('aprobado'), false);
  assert.equal(puedeEditarloElEstudiante('rechazado'), false);
});

test('solo se presenta lo editable y solo se revisa lo presentado', () => {
  assert.equal(puedeEnviarse('borrador'), true);
  assert.equal(puedeEnviarse('pendiente'), false);
  assert.equal(puedeRevisarse('pendiente'), true);
  assert.equal(puedeRevisarse('aprobado'), false);
});

test('nadie revisa su propio trámite, ni siendo administrador', () => {
  const propio = { id_usuario: 'u-1', id_destinatario: 'u-1' };
  assert.equal(puedeRevisarlo(propio, 'u-1', true), false);
});

test('revisa el destinatario; el administrador puede además, un tercero no', () => {
  const tramite = { id_usuario: 'estudiante', id_destinatario: 'coordinador' };
  assert.equal(puedeRevisarlo(tramite, 'coordinador', false), true);
  assert.equal(puedeRevisarlo(tramite, 'admin', true), true);
  assert.equal(puedeRevisarlo(tramite, 'otro-docente', false), false);
  assert.equal(puedeRevisarlo(tramite, null, true), false);
});

test('un trámite sin destinatario solo lo alcanza el administrador', () => {
  const huerfano = { id_usuario: 'estudiante', id_destinatario: null };
  assert.equal(puedeRevisarlo(huerfano, 'coordinador', false), false);
  assert.equal(puedeRevisarlo(huerfano, 'admin', true), true);
});

test('el reenvío se deduce de la versión, sin estado aparte', () => {
  assert.equal(esReenvio(0), false);
  assert.equal(esReenvio(1), false);
  assert.equal(esReenvio(2), true);
});

test('rechazar y pedir cambios exigen observaciones; aprobar no', () => {
  assert.equal(decisionNecesitaObservaciones('rechazado'), true);
  assert.equal(decisionNecesitaObservaciones('cambios_solicitados'), true);
  assert.equal(decisionNecesitaObservaciones('aprobado'), false);
});
