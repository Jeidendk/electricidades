/**
 * Transcribe las solicitudes del repositorio de Electricidad a plantillas del generador.
 *
 * Los documentos viven en Google Docs y se leen por su endpoint de exportación a texto plano,
 * que no necesita sesión mientras el documento esté compartido por enlace. Se transcribe lo
 * que el documento dice: NADA se reescribe ni se completa, porque son formatos institucionales
 * revisados contra el Reglamento de Régimen Académico.
 *
 * Solo entran SOLICITUDES y JUSTIFICACIONES (oficios de una página con la misma maqueta).
 * Guías, instructivos, anexos y rúbricas se quedan como enlace: no son oficios y el generador
 * no reproduce su estructura.
 *
 * Uso:  node scripts/transcribir-solicitudes.mjs
 * Salida: src/modules/admin/data/plantillasSolicitudes.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGEN = 'scripts/data/documentos-electricidad.tsv';
const DESTINO = 'src/modules/admin/data/plantillasSolicitudes.ts';

/** Categoría del catálogo cuyos documentos son oficios rellenables. */
const CATEGORIA_SOLICITUDES = 'Solicitudes';

/** Marcas del documento que separan sus partes. Son literales del formato institucional. */
const MARCA_PRESENTE = 'Presente.';
const MARCA_ASUNTO = 'Asunto:';
const MARCA_SALUDO = 'De mi consideración:';
const MARCA_ADJUNTOS = 'Documentos adjuntos:';
const MARCA_CIERRE = 'Por la atención';
const MARCA_FIRMA = 'Atentamente,';
const MARCA_REFERENCIA = 'Referencia normativa';

const leerCatalogo = () =>
  readFileSync(ORIGEN, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(linea => {
      const [nombre, formato, categoria, docId] = linea.split('|');
      return { nombre: nombre.replace(/^\d+\s+/, '').trim(), formato, categoria, docId };
    });

const descargarTexto = async docId => {
  const respuesta = await fetch(`https://docs.google.com/document/d/${docId}/export?format=txt`);
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
  const texto = await respuesta.text();
  // Un documento restringido devuelve 200 con la página de inicio de sesión, no el contenido.
  if (texto.includes('<!DOCTYPE html') || texto.includes('accounts.google.com')) {
    throw new Error('el documento no es público');
  }
  return texto;
};

/**
 * Parte el texto en las secciones del oficio. Lo que no se reconoce se deja fuera en vez de
 * adivinarse: una plantilla a medias es peor que una que no se genera.
 */
const analizar = texto => {
  const lineas = texto.split(/\r?\n/).map(l => l.replace(/ /g, ' ').trimEnd());
  const indice = marca => lineas.findIndex(l => l.trimStart().startsWith(marca));

  const iPresente = indice(MARCA_PRESENTE);
  const iAsunto = indice(MARCA_ASUNTO);
  const iSaludo = indice(MARCA_SALUDO);
  const iAdjuntos = indice(MARCA_ADJUNTOS);
  const iCierre = indice(MARCA_CIERRE);
  const iFirma = indice(MARCA_FIRMA);
  const iReferencia = indice(MARCA_REFERENCIA);

  if (iAsunto === -1 || iSaludo === -1) return null;

  const limpio = trozo => trozo.map(l => l.trim()).filter(Boolean);

  const finCuerpo = [iAdjuntos, iCierre, iFirma].filter(i => i > iSaludo).sort((a, b) => a - b)[0]
    ?? lineas.length;

  // Las tablas de Google Docs salen como filas con tabuladores; hay que mirarlas ANTES de
  // recortar los espacios, o el tabulador inicial desaparece y la fila pasa por párrafo.
  const bruto = lineas.slice(iSaludo + 1, finCuerpo).filter(l => l.trim());
  const tieneTabla = bruto.some(l => l.includes('\t'));
  // La primera celda de la cabecera ("No.") sale sin tabulador y se colaba como párrafo.
  const cuerpo = bruto
    .filter(l => !l.includes('\t'))
    .map(l => l.trim())
    .filter(l => !(tieneTabla && /^No\.$/.test(l)));

  const finAdjuntos = [iCierre, iFirma].filter(i => i > iAdjuntos).sort((a, b) => a - b)[0] ?? lineas.length;
  const adjuntos = iAdjuntos === -1
    ? []
    : limpio(lineas.slice(iAdjuntos + 1, finAdjuntos)).map(l => l.replace(/^\d+[.)]\s*/, ''));

  return {
    // La fecha la pone el sistema, no la plantilla: la primera línea es "Riobamba, [DÍA]…".
    destinatario: limpio(lineas.slice(1, iPresente === -1 ? iAsunto : iPresente)),
    asunto: lineas[iAsunto].replace(MARCA_ASUNTO, '').trim(),
    cuerpo,
    adjuntos,
    referencia: iReferencia === -1 ? '' : limpio(lineas.slice(iReferencia)).join(' '),
    tieneTabla,
  };
};

const comoLiteral = valor => JSON.stringify(valor);

const main = async () => {
  const solicitudes = leerCatalogo().filter(d => d.categoria === CATEGORIA_SOLICITUDES);
  console.log(`Solicitudes en el catálogo: ${solicitudes.length}`);

  const plantillas = [];
  const descartadas = [];

  for (const doc of solicitudes) {
    try {
      const analisis = analizar(await descargarTexto(doc.docId));
      if (!analisis) {
        descartadas.push(`${doc.nombre}: no tiene la maqueta de oficio (sin Asunto o saludo)`);
        continue;
      }
      plantillas.push({ ...doc, ...analisis });
      console.log(`  ok  ${doc.nombre}${analisis.tieneTabla ? '  (lleva tabla)' : ''}`);
    } catch (error) {
      descartadas.push(`${doc.nombre}: ${error.message}`);
      console.log(`  --  ${doc.nombre}: ${error.message}`);
    }
  }

  const cabecera = `// GENERADO por scripts/transcribir-solicitudes.mjs — no editar a mano.
//
// Transcripción literal de las solicitudes del repositorio de la Carrera de Electricidad.
// Los marcadores entre corchetes son los del documento original y se rellenan al generar.
// Regenerar con:  node scripts/transcribir-solicitudes.mjs

export interface PlantillaSolicitud {
  /** Nombre del documento en el repositorio. */
  nombre: string;
  /** Líneas del destinatario, tal como están escritas en el oficio. */
  destinatario: string[];
  asunto: string;
  /** Párrafos del cuerpo, con sus marcadores [ASÍ] sin tocar. */
  cuerpo: string[];
  /** Lista de "Documentos adjuntos"; vacía si el oficio no pide ninguno. */
  adjuntos: string[];
  /** Nota final de norma y plazo, cuando el documento la trae. */
  referencia: string;
  /** El original incluye una tabla que el generador todavía no dibuja. */
  tieneTabla: boolean;
  /** Documento de origen, para volver a compararlo. */
  docId: string;
}

export const plantillasSolicitudes: PlantillaSolicitud[] = `;

  const cuerpo = JSON.stringify(
    plantillas.map(p => ({
      nombre: p.nombre,
      destinatario: p.destinatario,
      asunto: p.asunto,
      cuerpo: p.cuerpo,
      adjuntos: p.adjuntos,
      referencia: p.referencia,
      tieneTabla: p.tieneTabla,
      docId: p.docId,
    })),
    null,
    2,
  );

  writeFileSync(DESTINO, `${cabecera}${cuerpo};\n`, 'utf8');

  console.log(`\nTranscritas: ${plantillas.length}`);
  console.log(`Con tabla (el generador aún no la dibuja): ${plantillas.filter(p => p.tieneTabla).length}`);
  if (descartadas.length) {
    console.log('\nDescartadas:');
    for (const linea of descartadas) console.log(`  - ${linea}`);
  }
  console.log(`\nEscrito ${DESTINO}`);
  void comoLiteral;
};

await main();
