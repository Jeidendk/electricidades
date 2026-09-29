/**
 * Pruebas de las plantillas de oficio transcritas.
 *
 * Ejecutar:  node --experimental-strip-types --test src/lib/plantillaOficio.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  destinatarioDe,
  marcadoresDe,
  plantillaDe,
  prellenarDesdePerfil,
  rellenarMarcadores,
  type PlantillaOficio,
} from './plantillaOficio.ts';

const plantillaDePrueba: PlantillaOficio = {
  asunto: 'Justificación de inasistencia a clases hasta por cinco días',
  destinatario: ['Ing. Andrés Fernando Morocho Caiza', 'COORDINADOR DE LA CARRERA DE ELECTRICIDAD'],
  parrafos: [
    'Yo, [NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE], con cédula [NÚMERO DE CÉDULA], estudiante del PAO [NÚMERO DE PAO].',
    'La inasistencia se produjo por [DESCRIBIR EL MOTIVO]. Adjunto respaldos.',
  ],
  adjuntos: ['Copia de la cédula de identidad.'],
  referencia: 'RRA ESPOCH, art. 38 lit. c).',
  tieneTabla: false,
};

test('los marcadores salen del texto, sin repetirse y en orden', () => {
  assert.deepEqual(marcadoresDe(plantillaDePrueba), [
    '[NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE]',
    '[NÚMERO DE CÉDULA]',
    '[NÚMERO DE PAO]',
    '[DESCRIBIR EL MOTIVO]',
  ]);
});

test('rellenar sustituye lo completado y deja el resto tal cual', () => {
  const texto = rellenarMarcadores(plantillaDePrueba.parrafos[0], {
    '[NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE]': 'LADY URRUTIA',
    '[NÚMERO DE CÉDULA]': '',
  });
  assert.ok(texto.includes('Yo, LADY URRUTIA'));
  // Un hueco sin completar se queda visible: el estudiante ve qué le falta antes de entregar.
  assert.ok(texto.includes('[NÚMERO DE CÉDULA]'));
  assert.ok(texto.includes('[NÚMERO DE PAO]'));
});

test('el perfil prellena lo que el sistema sabe y nada más', () => {
  const valores = prellenarDesdePerfil(marcadoresDe(plantillaDePrueba), {
    nombreCompleto: 'LADY URRUTIA',
    codigoInstitucional: '1234',
    pao: 5,
    carrera: 'ELECTRICIDAD',
  });
  assert.equal(valores['[NOMBRES Y APELLIDOS DEL/DE LA ESTUDIANTE]'], 'LADY URRUTIA');
  assert.equal(valores['[NÚMERO DE PAO]'], 'PAO 5');
  // La cédula no está en el perfil: inventarla pondría un número falso en un documento oficial.
  assert.equal(valores['[NÚMERO DE CÉDULA]'], '');
  assert.equal(valores['[DESCRIBIR EL MOTIVO]'], '');
});

test('el destinatario se reparte según cuántas líneas traiga', () => {
  assert.deepEqual(destinatarioDe(plantillaDePrueba.destinatario), {
    titulo: '',
    nombre: 'Ing. Andrés Fernando Morocho Caiza',
    cargo: 'COORDINADOR DE LA CARRERA DE ELECTRICIDAD',
  });
  assert.deepEqual(destinatarioDe(['Señores/as', 'MIEMBROS DE LA COMISIÓN DE CARRERA']), {
    titulo: '',
    nombre: 'Señores/as',
    cargo: 'MIEMBROS DE LA COMISIÓN DE CARRERA',
  });
  // Un oficio dirigido a un órgano no lleva nombre: esa línea es el cargo.
  assert.deepEqual(destinatarioDe(['MIEMBROS DE LA COMISIÓN DE CARRERA']), {
    titulo: '',
    nombre: '',
    cargo: 'MIEMBROS DE LA COMISIÓN DE CARRERA',
  });
});

test('solo se reconoce como plantilla lo que tiene párrafos', () => {
  assert.equal(plantillaDe(null), null);
  assert.equal(plantillaDe({ nombreFormato: 'hecha a mano' }), null);
  assert.equal(plantillaDe({ plantilla: { parrafos: [] } }), null);
  assert.ok(plantillaDe({ plantilla: { parrafos: ['algo'] } }));
});
