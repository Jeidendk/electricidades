/**
 * Ejecutar: node --experimental-strip-types --test src/lib/asistente/baseConocimiento.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clasificarDocumento, contarPorEstado, type FilaFormato } from './baseConocimiento.ts';

const SIN_EXCLUIDOS = new Set<string>();

const fila = (extra: Partial<FilaFormato>): FilaFormato => ({
  id: 'id-1',
  nombre: 'Documento',
  tipo: 'ENLACE',
  ...extra,
});

test('una plantilla del sistema queda pendiente: su texto ya está aquí', () => {
  const documento = clasificarDocumento(
    fila({ tipo: 'DINAMICO', datos: { plantilla: { parrafos: ['algo'] } } }),
    SIN_EXCLUIDOS,
    'Solicitudes',
  );
  assert.equal(documento.origen, 'plantilla');
  assert.equal(documento.estado, 'pendiente');
});

test('un enlace a Drive o SharePoint no es contenido accesible', () => {
  for (const enlace of [
    'https://docs.google.com/document/d/abc/edit',
    'https://espoch-my.sharepoint.com/personal/x/Documents/a.docx',
  ]) {
    const documento = clasificarDocumento(fila({ enlace }), SIN_EXCLUIDOS, 'Titulación');
    assert.equal(documento.estado, 'sin-acceso', enlace);
    assert.match(documento.detalle ?? '', /no es contenido accesible/i);
  }
});

test('un archivo con texto queda pendiente y uno escaneado pide OCR', () => {
  const docx = clasificarDocumento(fila({ archivo_nombre: 'anexo.docx' }), SIN_EXCLUIDOS, 'Prácticas');
  assert.equal(docx.estado, 'pendiente');

  const imagen = clasificarDocumento(fila({ archivo_nombre: 'escaneo.jpg' }), SIN_EXCLUIDOS, 'Prácticas');
  assert.equal(imagen.estado, 'requiere-ocr');
});

test('excluir gana sobre cualquier otro estado y no borra el documento', () => {
  const documento = clasificarDocumento(
    fila({ tipo: 'DINAMICO', datos: { plantilla: { parrafos: ['algo'] } } }),
    new Set(['id-1']),
    'Solicitudes',
  );
  assert.equal(documento.estado, 'excluido');
  assert.match(documento.detalle ?? '', /sigue disponible en el repositorio/i);
});

test('ningún documento se marca como indexado sin que exista indexación', () => {
  const documentos = [
    clasificarDocumento(fila({ archivo_nombre: 'a.pdf' }), SIN_EXCLUIDOS, 'X'),
    clasificarDocumento(fila({ enlace: 'https://drive.google.com/file/d/1' }), SIN_EXCLUIDOS, 'X'),
    clasificarDocumento(fila({ tipo: 'DINAMICO', datos: { plantilla: { parrafos: ['a'] } } }), SIN_EXCLUIDOS, 'X'),
  ];
  assert.equal(contarPorEstado(documentos).indexado, 0);
});
