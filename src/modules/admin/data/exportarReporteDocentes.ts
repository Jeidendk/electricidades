import banderaEspoch from '../../../assets/Bandera-ESPOCH-HORARIOS.webp';
import {
  AlignmentType, BorderStyle, Document, Footer, ImageRun, Packer, Paragraph,
  Table, TableCell, TableRow, TextRun, VerticalAlignTable, WidthType,
  type FileChild,
} from 'docx';
import { diasFormales, horas, rangoIncluyeBloque, etiquetaPaoParalelo } from '../components/Horarios/horariosData';
import { mismoDia } from '../../../lib/texto';
import {
  CABECERAS_CSV_DOCENTES, filasCsvDocentes,
  type BloqueDocente, type ResumenDocente,
} from './reporteDocentes';

/** Anchos de columna del Excel, en caracteres, en el orden de las cabeceras. */
const ANCHOS_DETALLE = [34, 12, 12, 12, 8, 38, 8, 10, 28, 16, 26];
const CABECERAS_RESUMEN = ['Docente', 'Materias', 'Horas/semana'];
const ANCHOS_RESUMEN = [38, 12, 14];

const FONDO_CABECERA = 'FF1A1F26';

/**
 * Genera el .xlsx con dos hojas: un resumen por docente —que es donde se lee de un vistazo la
 * carga semanal— y el detalle con una fila por bloque de clase.
 *
 * `exceljs` se carga bajo demanda: pesa cerca de 1 MB y no tiene por qué entrar en el paquete
 * de quien solo abre la pantalla a mirar.
 */
export const exportarExcelDocentes = async (
  resumenes: ResumenDocente[],
  nombreEdificio: (id: string) => string,
  nombreArchivo: string,
) => {
  const ExcelJS = await import('exceljs');
  const libro = new ExcelJS.Workbook();

  const darEstiloCabecera = (hoja: any, columnas: number) => {
    const cabecera = hoja.getRow(1);
    cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FONDO_CABECERA } };
    cabecera.alignment = { vertical: 'middle' };
    // Cabecera congelada y autofiltro: con cientos de filas, revisar sin esto es a ciegas.
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
    hoja.autoFilter = { from: 'A1', to: { row: 1, column: columnas } };
  };

  const resumen = libro.addWorksheet('Resumen');
  resumen.addRow(CABECERAS_RESUMEN);
  resumen.columns = ANCHOS_RESUMEN.map(width => ({ width }));
  for (const docente of resumenes) {
    resumen.addRow([docente.docente, docente.materias.length, docente.horasSemana]);
  }
  resumen.addRow([]);
  const total = resumen.addRow([
    'TOTAL', '', resumenes.reduce((suma, docente) => suma + docente.horasSemana, 0),
  ]);
  total.font = { bold: true };
  darEstiloCabecera(resumen, CABECERAS_RESUMEN.length);

  const detalle = libro.addWorksheet('Detalle');
  detalle.addRow(CABECERAS_CSV_DOCENTES);
  detalle.columns = ANCHOS_DETALLE.map(width => ({ width }));
  for (const fila of filasCsvDocentes(resumenes, nombreEdificio)) detalle.addRow(fila);
  darEstiloCabecera(detalle, CABECERAS_CSV_DOCENTES.length);

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
};

const escaparHtml = (texto: unknown) =>
  String(texto ?? '').replace(/[&<>]/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[caracter]!));

/** Bloque que ocupa una casilla de la grilla, o undefined si esa hora está libre. */
const bloqueEnCasilla = (bloques: BloqueDocente[], dia: string, franja: string) =>
  bloques.find(bloque =>
    mismoDia(bloque.dia, dia) &&
    rangoIncluyeBloque(`${bloque.horaInicio} - ${bloque.horaFin}`, franja),
  );

/** Contenido de una casilla: materia arriba y, debajo, dónde y de qué carrera es. */
const casilla = (bloque?: BloqueDocente) => {
  if (!bloque) return '';
  const paoParalelo = etiquetaPaoParalelo(bloque.pao, bloque.paralelo);
  const ubicacion = [bloque.aula, bloque.carrera].filter(Boolean).map(escaparHtml).join(' · ');
  return `
    <div class="materia">${escaparHtml(bloque.materia)}</div>
    ${paoParalelo ? `<div class="sub">${escaparHtml(paoParalelo)}</div>` : ''}
    ${ubicacion ? `<div class="sub">${ubicacion}</div>` : ''}`;
};

/**
 * Franjas que el docente realmente ocupa.
 *
 * Un horario individual usa una parte pequeña de la jornada: imprimir las doce franjas deja
 * media hoja en blanco. Se omiten las vacías, y como cada fila lleva su rango horario escrito,
 * un salto entre 11H00 y 15H00 se lee sin ambigüedad.
 *
 * Si por lo que sea no quedara ninguna, se devuelven todas: mejor una grilla vacía que ninguna.
 */
const franjasConClase = (bloques: BloqueDocente[]) => {
  const ocupadas = horas.filter(franja =>
    diasFormales.some(dia => bloqueEnCasilla(bloques, dia, franja)),
  );
  return ocupadas.length > 0 ? ocupadas : horas;
};

const imagenComoPng = (url: string): Promise<Uint8Array> => new Promise((resolve, reject) => {
  const imagen = new Image();
  imagen.crossOrigin = 'anonymous';
  imagen.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = imagen.naturalWidth;
    canvas.height = imagen.naturalHeight;
    const contexto = canvas.getContext('2d');
    if (!contexto) {
      reject(new Error('No se pudo preparar el escudo institucional.'));
      return;
    }
    contexto.drawImage(imagen, 0, 0);
    const base64 = canvas.toDataURL('image/png').split(',')[1];
    resolve(Uint8Array.from(atob(base64), caracter => caracter.charCodeAt(0)));
  };
  imagen.onerror = () => reject(new Error('No se pudo cargar el escudo institucional.'));
  imagen.src = url;
});

/**
 * Genera un Word editable con una hoja por docente. Conserva la misma estructura del PDF:
 * encabezado institucional, resumen de carga, grilla semanal y pie de página.
 */
export const exportarWordDocentes = async (
  resumenes: ResumenDocente[],
  nombreEdificio: (id: string) => string,
  nombreArchivo = 'carga-docente.docx',
) => {
  const fuente = 'Times New Roman';
  const texto = (contenido: string, negrita = false, tamano = 16) =>
    new TextRun({ text: contenido, bold: negrita, size: tamano, font: fuente });
  const parrafoCentrado = (contenido: string, negrita = false, tamano = 16) =>
    new Paragraph({
      children: [texto(contenido, negrita, tamano)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
    });
  const borde = { style: BorderStyle.SINGLE, size: 6, color: '222222' };
  const celda = (renglones: { contenido: string; negrita?: boolean }[], ancho?: number) => new TableCell({
    width: ancho ? { size: ancho, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlignTable.CENTER,
    borders: { top: borde, bottom: borde, left: borde, right: borde },
    margins: { top: 45, bottom: 45, left: 35, right: 35 },
    children: (renglones.length ? renglones : [{ contenido: '' }]).map(renglon =>
      parrafoCentrado(renglon.contenido, renglon.negrita, renglon.negrita ? 16 : 14),
    ),
  });
  const sinBorde = { style: BorderStyle.NONE };
  let escudo: Uint8Array | null = null;
  try {
    escudo = await imagenComoPng(banderaEspoch);
  } catch {
    // El documento sigue siendo válido con el nombre institucional si la imagen no carga.
  }

  const hijos: FileChild[] = [];
  resumenes.forEach((resumen, indice) => {
    if (indice > 0) hijos.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 0 } }));
    hijos.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [2900, 9200, 2900],
      borders: {
        top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde,
        insideHorizontal: sinBorde, insideVertical: sinBorde,
      },
      rows: [new TableRow({
        children: [
          new TableCell({
            borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde },
            verticalAlign: VerticalAlignTable.CENTER,
            children: [new Paragraph({
              children: escudo
                ? [new ImageRun({ type: 'png', data: escudo, transformation: { width: 150, height: 92 } })]
                : [texto('ESPOCH', true, 20)],
            })],
          }),
          new TableCell({
            borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde },
            verticalAlign: VerticalAlignTable.CENTER,
            children: [
              parrafoCentrado('ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO', true, 28),
              new Paragraph({
                children: [texto('FACULTAD DE INFORMÁTICA Y ELECTRÓNICA', true, 20)],
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 0 },
              }),
            ],
          }),
          new TableCell({
            borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde },
            children: [new Paragraph('')],
          }),
        ],
      })],
    }));
    hijos.push(new Paragraph({
      children: [texto(' ')],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'EF4444' } },
      spacing: { after: 80 },
    }));
    hijos.push(new Paragraph({
      children: [texto(resumen.docente.toUpperCase(), true, 22)],
      spacing: { after: 35 },
    }));
    hijos.push(new Paragraph({
      children: [texto(`TOTAL DE HORAS SEMANALES: ${resumen.horasSemana}`, true, 17)],
      spacing: { after: 25 },
    }));
    hijos.push(new Paragraph({
      children: [texto(
        `${resumen.materias.length} ${resumen.materias.length === 1 ? 'MATERIA' : 'MATERIAS'}: ${resumen.materias.join(' · ')}`,
        true,
        16,
      )],
      spacing: { after: 100 },
    }));

    const filas = [new TableRow({
      tableHeader: true,
      children: ['HORA', ...diasFormales].map((dia, posicion) =>
        celda([{ contenido: dia.toUpperCase(), negrita: true }], posicion === 0 ? 1500 : undefined),
      ),
    })];
    franjasConClase(resumen.bloques).forEach(franja => {
      const celdas = [celda([{ contenido: franja.replace(/:00/g, 'H00'), negrita: true }], 1500)];
      diasFormales.forEach(dia => {
        const bloque = bloqueEnCasilla(resumen.bloques, dia, franja);
        if (!bloque) {
          celdas.push(celda([]));
          return;
        }
        const pao = etiquetaPaoParalelo(bloque.pao, bloque.paralelo);
        const ubicacion = [bloque.aula, nombreEdificio(bloque.edificio)].filter(Boolean).join(' · ');
        celdas.push(celda([
          { contenido: bloque.materia.toUpperCase(), negrita: true },
          ...(pao ? [{ contenido: pao }] : []),
          ...(bloque.carrera ? [{ contenido: bloque.carrera.toUpperCase() }] : []),
          ...(ubicacion ? [{ contenido: ubicacion.toUpperCase() }] : []),
        ]));
      });
      filas.push(new TableRow({ children: celdas, cantSplit: true }));
    });
    hijos.push(new Table({
      rows: filas,
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [1500, 2700, 2700, 2700, 2700, 2700],
    }));
  });

  const pie = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [texto(
        'Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155.  Riobamba - Ecuador',
        false,
        14,
      )],
    })],
  });
  const documento = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 16838, height: 11906 },
          margin: { top: 650, bottom: 900, left: 650, right: 650, footer: 300 },
        },
      },
      footers: { default: pie },
      children: hijos,
    }],
  });
  const url = URL.createObjectURL(await Packer.toBlob(documento));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Una hoja por docente, con la misma maqueta institucional que el horario por aula. */
const paginaDeDocente = (resumen: ResumenDocente, incluirPie: boolean) => {
  const filas = franjasConClase(resumen.bloques).map(franja => `
    <tr>
      <td class="hora">${escaparHtml(franja.replace(/:00/g, 'H00'))}</td>
      ${diasFormales.map(dia => `<td>${casilla(bloqueEnCasilla(resumen.bloques, dia, franja))}</td>`).join('')}
    </tr>`).join('');

  return `
  <section class="hoja">
    <table class="encabezado">
      <tr>
        <td width="180"><img src="${banderaEspoch}" alt="Escudo ESPOCH" /></td>
        <td align="center">
          <h1>ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO</h1>
          <h2>FACULTAD DE INFORMÁTICA Y ELECTRÓNICA</h2>
        </td>
        <td width="140"></td>
      </tr>
    </table>

    <div class="identificacion">
      <span class="docente">${escaparHtml(resumen.docente)}</span>
      <div class="dato">TOTAL DE HORAS SEMANALES: ${resumen.horasSemana}</div>
      <div class="dato">${resumen.materias.length} ${resumen.materias.length === 1 ? 'MATERIA' : 'MATERIAS'}: ${escaparHtml(resumen.materias.join(' · '))}</div>
    </div>

    <table class="horario">
      <thead>
        <tr><th class="hora">HORA</th>${diasFormales.map(dia => `<th>${escaparHtml(dia.toUpperCase())}</th>`).join('')}</tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>

    ${incluirPie ? `<div class="pie">
      Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155.<br/>
      Riobamba - Ecuador
    </div>` : ''}
  </section>`;
};

/**
 * Abre el diálogo de impresión con el horario de cada docente maquetado como el de aulas:
 * escudo, encabezado institucional, grilla semanal y pie. El navegador pagina y el usuario
 * elige "Guardar como PDF", igual que en la pantalla Horarios.
 */
export const exportarPdfDocentes = (resumenes: ResumenDocente[], incluirPie = true) => {
  const marco = document.createElement('iframe');
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(marco);

  const documento = marco.contentWindow?.document;
  if (!documento) {
    document.body.removeChild(marco);
    throw new Error('No se pudo preparar el documento de impresión.');
  }

  documento.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>Horario por docente</title>
    <style>
      @page { size: A4 landscape; margin: 12mm 14mm; }
      body { font-family: "Times New Roman", Times, serif; color: #0f172a; margin: 0; font-size: 11px; }

      /* Cada docente en su propia hoja, como un documento entregable por persona. */
      .hoja { page-break-after: always; }
      .hoja:last-child { page-break-after: auto; }

      table.encabezado { width: 100%; border-collapse: collapse; border-bottom: 1px solid #ef4444; margin-bottom: 10px; }
      table.encabezado td { padding: 0; vertical-align: middle; }
      table.encabezado img { height: 96px; width: 146px; display: block; }
      h1 { font-size: 15px; font-weight: 900; letter-spacing: 2px; margin: 0 0 8px; text-transform: uppercase; }
      h2 { font-size: 12px; font-weight: 600; letter-spacing: 1px; color: #475569; margin: 0 0 6px; text-transform: uppercase; }

      .identificacion { margin-bottom: 10px; }
      .docente { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px;
                 border-bottom: 2px solid #000; padding: 0 40px 2px 0; display: inline-block; }
      .dato { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; margin-top: 6px; }

      table.horario { width: 100%; border-collapse: collapse; }
      table.horario th, table.horario td { border: 1.5px solid #000; padding: 4px 3px; text-align: center; vertical-align: middle; }
      table.horario th { font-weight: 900; text-transform: uppercase; font-size: 10px; }
      td.hora, th.hora { width: 82px; font-weight: 700; font-size: 10px; white-space: nowrap; }
      .materia { font-weight: 900; text-transform: uppercase; font-size: 10px; line-height: 1.15; }
      .sub { font-size: 8px; text-transform: uppercase; color: #475569; line-height: 1.15; }

      /* La cabecera se repite si un horario se parte, y nunca se corta una fila por la mitad. */
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }

      .pie { margin-top: 26px; border-top: 1px solid #ef4444; padding-top: 14px; text-align: center;
             font-size: 9px; color: #6b7280; }
    </style></head><body>
    ${resumenes.map(resumen => paginaDeDocente(resumen, incluirPie)).join('')}
  </body></html>`);
  documento.close();

  // El navegador necesita un instante para maquetar y cargar el escudo antes de imprimir.
  setTimeout(() => {
    marco.contentWindow?.focus();
    marco.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(marco)) document.body.removeChild(marco);
    }, 1000);
  }, 600);
};
