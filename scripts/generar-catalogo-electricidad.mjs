// Inventario leído del catálogo público el 2026-09-28. No descarga ni publica archivos.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const fuente = 'https://asistente-electricidad-espoch.andresmorocho.chatgpt.site/';
const filas = readFileSync(new URL('./data/documentos-electricidad.tsv', import.meta.url), 'utf8').trim().split(/\r?\n/).map(linea => linea.split('|'));
const destinos = new Map();
function ubicar(indices, publico, ...ruta) {
  for (const indice of indices) {
    assert.ok(!destinos.has(indice), `Documento clasificado dos veces: ${indice}`);
    destinos.set(indice, { publico, ruta });
  }
}

ubicar([60], 'estudiantes', 'Trámites académicos', 'Guías de trámites');
ubicar([68,69,70,71,72], 'estudiantes', 'Trámites académicos', 'Justificación de inasistencias');
ubicar([92,96,101,108], 'estudiantes', 'Trámites académicos', 'Matrículas y reingresos');
ubicar([104,105,106], 'estudiantes', 'Trámites académicos', 'Retiros de asignaturas y matrícula');
ubicar([90,99,103], 'estudiantes', 'Trámites académicos', 'Evaluaciones y recalificaciones');
ubicar([93,97], 'estudiantes', 'Trámites académicos', 'Homologación y movilidad de asignaturas');
ubicar([89], 'estudiantes', 'Trámites académicos', 'Devolución de valores');
ubicar([2,3,4,5,6], 'estudiantes', 'Prácticas preprofesionales', 'Anexos y seguimiento');
ubicar([86,94,95], 'estudiantes', 'Prácticas preprofesionales', 'Solicitudes');
ubicar([58,75,85], 'estudiantes', 'Ayudantías', 'Postulación y planificación');
ubicar([61,62,63], 'estudiantes', 'Ayudantías', 'Informes');
ubicar([0,1,8,73,74,79], 'estudiantes', 'Titulación', 'Guías y cronogramas');
ubicar([17,18,19], 'estudiantes', 'Titulación', 'Anteproyectos');
ubicar([59,76,77], 'estudiantes', 'Titulación', 'Trabajos escritos');
ubicar([57,80], 'estudiantes', 'Titulación', 'Referencias IEEE');
ubicar([43,78], 'estudiantes', 'Titulación', 'Sustentación y presentación');
ubicar([82,83,84], 'estudiantes', 'Titulación', 'Rúbricas de evaluación');
ubicar([87,88,91,98,100,102,107], 'estudiantes', 'Titulación', 'Solicitudes');
ubicar([39,45,53], 'estudiantes', 'Vida estudiantil', 'Movilidad, reconocimientos y giras');

ubicar([9,10,11], 'docentes', 'Docencia y seguimiento académico', 'Estrategias didácticas');
ubicar([21,44], 'docentes', 'Docencia y seguimiento académico', 'Evaluación y calificaciones');
ubicar([36,49], 'docentes', 'Docencia y seguimiento académico', 'Seguimiento del sílabo');
ubicar([33,51], 'docentes', 'Docencia y seguimiento académico', 'Prácticas formativas');
ubicar([27,48], 'docentes', 'Docencia y seguimiento académico', 'Aulas virtuales');
ubicar([38], 'docentes', 'Docencia y seguimiento académico', 'Informes TAC');
ubicar([24,29,42], 'docentes', 'Acompañamiento estudiantil', 'Capacitación y actividades complementarias');
ubicar([32], 'docentes', 'Acompañamiento estudiantil', 'Nivelación y refuerzo académico');
ubicar([15,16,30,50], 'docentes', 'Acompañamiento estudiantil', 'Tutorías');
ubicar([12,66], 'docentes', 'Acompañamiento estudiantil', 'Evaluación de ayudantías');
ubicar([7], 'docentes', 'Acompañamiento estudiantil', 'Seguimiento de prácticas preprofesionales');
ubicar([20], 'docentes', 'Acompañamiento estudiantil', 'Seguimiento de titulación');
ubicar([52,54,55,56], 'docentes', 'Giras y visitas académicas');
ubicar([28,41], 'docentes', 'Desarrollo docente', 'Capacitación');
ubicar([25,35,65], 'docentes', 'Desarrollo docente', 'Afinidad, rotación y trayectoria');
ubicar([64,46], 'docentes', 'Desarrollo docente', 'Movilidad y reconocimientos');

ubicar([13,14], 'gestion', 'Gestión de carrera', 'Actas de comisiones');
ubicar([37,40], 'gestion', 'Gestión de carrera', 'Planificación e informes');
ubicar([34], 'gestion', 'Gestión de carrera', 'Resultados de aprendizaje');
ubicar([26,47,67], 'gestion', 'Ambientes y recursos', 'Ambientes de aprendizaje');
ubicar([31], 'gestion', 'Ambientes y recursos', 'Herramientas pedagógicas');
ubicar([22,23,81], 'gestion', 'Identidad institucional');

const uuid = clave => {
  const h = createHash('sha256').update(`espoch-catalogo-2026:${clave}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};
const carpetas = new Map();
const documentos = filas.map(([nombre, extension, categoriaOrigen, driveId], indice) => {
  const destino = destinos.get(indice);
  assert.ok(destino, `Sin categoría: ${nombre}`);
  let padre = null;
  destino.ruta.forEach((nombre, nivel) => {
    const clave = `${destino.publico}/${destino.ruta.slice(0, nivel + 1).join('/')}`;
    const id = uuid(clave);
    if (!carpetas.has(id)) carpetas.set(id, { id, nombre, id_padre: padre, publico: destino.publico, orden: carpetas.size + 1 });
    padre = id;
  });
  const tipoGoogle = {DOCX:'document', XLSX:'spreadsheets', PPTX:'presentation'}[extension];
  const enlace = tipoGoogle
    ? `https://docs.google.com/${tipoGoogle}/d/${driveId}/edit`
    : `https://drive.google.com/file/d/${driveId}/view`;
  return { id: uuid(`documento/${driveId}`), nombre, extension, categoriaOrigen, driveId, enlace,
    descargaOrigen: `${fuente}api/documents/${driveId}`, id_serie: padre, publico: destino.publico, ruta: destino.ruta };
});
assert.equal(documentos.length, 109);
assert.equal(destinos.size, 109);
assert.equal(new Set(documentos.map(d => d.driveId)).size, 109);
const catalogo = { fuente, fechaRevision: '2026-09-28', carpetas: [...carpetas.values()], documentos };
writeFileSync(new URL('../src/modules/admin/data/catalogoElectricidad.ts', import.meta.url),
  '// Generado por scripts/generar-catalogo-electricidad.mjs. No editar a mano.\nexport const catalogoElectricidad = ' + JSON.stringify(catalogo, null, 2) + ' as const;\n');
console.log(JSON.stringify({documentos: documentos.length, carpetas: carpetas.size, perfiles: Object.fromEntries(['estudiantes','docentes','gestion'].map(p => [p, documentos.filter(d => d.publico === p).length]))}));
