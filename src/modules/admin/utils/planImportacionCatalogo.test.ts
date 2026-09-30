import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { catalogoElectricidad as catalogo } from '../data/catalogoElectricidad.ts';
import { identidadDocumento, planImportacionCatalogo } from './planImportacionCatalogo.ts';

test('la transcripción coincide con el inventario leído del sitio', () => {
  const texto = readFileSync(new URL('../../../../scripts/data/documentos-electricidad.tsv', import.meta.url), 'utf8').trim().replace(/\r\n/g, '\n');
  let hash = 2166136261;
  for (const caracter of texto) hash = Math.imul(hash ^ caracter.charCodeAt(0), 16777619) >>> 0;
  assert.equal(texto.length, 9518);
  assert.equal(hash, 3736820744);
});

test('109 documentos únicos, clasificados y con toda su jerarquía', () => {
  assert.equal(catalogo.documentos.length, 109);
  assert.equal(new Set(catalogo.documentos.map(d => d.driveId)).size, 109);
  const vistas = { estudiantes: 62, docentes: 35, gestion: 12 };
  for (const [publico, cantidad] of Object.entries(vistas)) assert.equal(catalogo.documentos.filter(d => d.publico === publico).length, cantidad);
  const ids = new Set<string>();
  for (const carpeta of catalogo.carpetas) {
    if (carpeta.id_padre) assert.ok(ids.has(carpeta.id_padre));
    ids.add(carpeta.id);
  }
  for (const doc of catalogo.documentos) {
    const carpeta = catalogo.carpetas.find(c => c.id === doc.id_serie)!;
    assert.ok(carpeta);
    assert.equal(carpeta.publico, doc.publico);
    assert.equal(identidadDocumento(doc.enlace), `drive:${doc.driveId}`);
    assert.equal(identidadDocumento(doc.descargaOrigen), `drive:${doc.driveId}`);
  }
});

test('reintentar una carga completa no crea categorías ni documentos', () => {
  const primera = planImportacionCatalogo([], []);
  const segunda = planImportacionCatalogo(primera.carpetas, primera.documentos);
  assert.equal(primera.documentos.length, 109);
  assert.equal(segunda.documentos.length, 0);
  assert.equal(segunda.carpetas.length, 0);
  assert.equal(segunda.existentes, 109);
});

test('reutiliza categorías existentes y omite enlaces equivalentes sin moverlos', () => {
  const raiz = catalogo.carpetas[0];
  const doc = catalogo.documentos[0];
  const categoria = { ...raiz, id: 'categoria-existente', nombre: ` ${raiz.nombre.toUpperCase()} ` };
  const plan = planImportacionCatalogo([categoria], [{id:'documento-existente', enlace:`https://drive.google.com/file/d/${doc.driveId}/view?usp=sharing`}]);
  assert.equal(plan.documentos.length, 108);
  assert.equal(plan.existentes, 1);
  assert.ok(!plan.carpetas.some(c => c.id === raiz.id));
  assert.ok(plan.carpetas.some(c => c.id_padre === categoria.id));
  assert.ok(!plan.documentos.some(d => d.driveId === doc.driveId));
});

test('recupera una importación parcial usando las categorías ya creadas', () => {
  const primera = planImportacionCatalogo([], []);
  const reintento = planImportacionCatalogo(primera.carpetas, primera.documentos.slice(0, 25));
  assert.equal(reintento.carpetas.length, 0);
  assert.equal(reintento.documentos.length, 84);
});

test('un conflicto de público se detecta antes de escribir', () => {
  const raiz = catalogo.carpetas[0];
  assert.throws(() => planImportacionCatalogo([{ ...raiz, publico:'gestion' }], []), /otro público/);
});
