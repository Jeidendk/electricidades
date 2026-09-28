import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carpetasReferencia, procesosRepositorio } from './repositorioElectricidad.ts';

test('la estructura tiene las 96 carpetas y 8 raíces de la referencia', () => {
  assert.equal(carpetasReferencia.length, 96);
  assert.equal(carpetasReferencia.filter(c => !c.padre).length, 8);
  assert.equal(new Set(carpetasReferencia.map(c => c.codigo)).size, 96);
});
test('cada padre precede a sus hijos y no hay nombres duplicados entre hermanos', () => {
  const visitados = new Set<string>();
  const nombres = new Set<string>();
  for (const carpeta of carpetasReferencia) {
    if (carpeta.padre) assert.ok(visitados.has(carpeta.padre), carpeta.codigo);
    const clave = `${carpeta.padre}/${carpeta.nombre}`;
    assert.ok(!nombres.has(clave), clave);
    nombres.add(clave);
    visitados.add(carpeta.codigo);
  }
});
test('todos los procesos abren una carpeta real del cuadro documental', () => {
  for (const proceso of procesosRepositorio) {
    assert.ok(carpetasReferencia.some(c => c.codigo === proceso.carpeta), proceso.id);
  }
  assert.equal(new Set(procesosRepositorio.map(p => p.id)).size, procesosRepositorio.length);
});
test('la migración contiene exactamente la misma estructura que la interfaz', () => {
  const sql = readFileSync(new URL('../../../../supabase/migrations/0034_estructura_repositorio_electricidad.sql', import.meta.url), 'utf8');
  const datos = sql.split('$datos$')[1];
  assert.deepEqual(JSON.parse(datos), carpetasReferencia);
});
