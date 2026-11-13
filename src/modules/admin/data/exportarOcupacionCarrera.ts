import banderaEspoch from '../../../assets/Bandera-ESPOCH-HORARIOS.webp';
import {
  AlignmentType, BorderStyle, Document, Footer, ImageRun, Packer, Paragraph,
  Table, TableCell, TableRow, TextRun, VerticalAlignTable, WidthType,
  type FileChild,
} from 'docx';
import type { EdificioOcupado, ResumenOcupacionCarrera } from './reporteOcupacionCarrera';

const escaparHtml = (texto: unknown) =>
  String(texto ?? '').replace(/[&<>]/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[caracter]!));

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

/** Nombres de espacios separados por punto medio o un guion si la lista está vacía. */
const listarEspacios = (espacios: { nombre: string }[]): string =>
  espacios.length ? espacios.map(e => e.nombre).join(' · ') : '—';

const bloqueEdificioHtml = (edificio: EdificioOcupado): string => `
  <div class="edificio">
    <div class="edificio-nombre">${escaparHtml(edificio.nombre)}</div>
    ${edificio.aulas.length ? `
      <div class="grupo"><span class="etiqueta">Aulas (${edificio.aulas.length})</span>
        <span class="valor">${escaparHtml(listarEspacios(edificio.aulas))}</span></div>` : ''}
    ${edificio.laboratorios.length ? `
      <div class="grupo"><span class="etiqueta">Laboratorios (${edificio.laboratorios.length})</span>
        <span class="valor">${escaparHtml(listarEspacios(edificio.laboratorios))}</span></div>` : ''}
    ${edificio.otros.length ? `
      <div class="grupo"><span class="etiqueta">Otros espacios (${edificio.otros.length})</span>
        <span class="valor">${escaparHtml(listarEspacios(edificio.otros))}</span></div>` : ''}
  </div>`;

/** Una sección por carrera con sus edificios dentro, maqueta institucional ESPOCH. */
const paginaDeCarrera = (resumen: ResumenOcupacionCarrera, incluirPie: boolean): string => `
  <section class="hoja">
    <table class="encabezado">
      <tr>
        <td width="180"><img src="${banderaEspoch}" alt="Escudo ESPOCH" /></td>
        <td align="center">
          <h1>ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO</h1>
          <h2>FACULTAD DE INFORMÁTICA Y ELECTRÓNICA</h2>
          <h3>OCUPACIÓN DE EDIFICIOS POR CARRERA</h3>
        </td>
        <td width="140"></td>
      </tr>
    </table>

    <div class="identificacion">
      <span class="carrera">${escaparHtml(resumen.carrera)}</span>
      <div class="dato">TOTAL: ${resumen.totalEspacios} ESPACIOS · ${resumen.totalAulas} AULAS · ${resumen.totalLaboratorios} LABORATORIOS · ${resumen.edificios.length} EDIFICIOS</div>
    </div>

    ${resumen.edificios.length
      ? resumen.edificios.map(bloqueEdificioHtml).join('')
      : '<div class="vacio">Esta carrera no tiene clases programadas en el período actual.</div>'}

    ${incluirPie ? `<div class="pie">
      Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155.<br/>
      Riobamba - Ecuador
    </div>` : ''}
  </section>`;

/**
 * Abre el diálogo de impresión con una hoja por carrera. El navegador pagina y el usuario
 * elige "Guardar como PDF", mismo patrón que Carga docente y Horarios por aula.
 */
export const exportarPdfOcupacion = (resumenes: ResumenOcupacionCarrera[], incluirPie = true) => {
  const marco = document.createElement('iframe');
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(marco);

  const documento = marco.contentWindow?.document;
  if (!documento) {
    document.body.removeChild(marco);
    throw new Error('No se pudo preparar el documento de impresión.');
  }

  documento.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>Ocupación por carrera</title>
    <style>
      @page { size: A4 portrait; margin: 14mm 14mm; }
      body { font-family: "Times New Roman", Times, serif; color: #0f172a; margin: 0; font-size: 11px; }

      .hoja { page-break-after: always; }
      .hoja:last-child { page-break-after: auto; }

      table.encabezado { width: 100%; border-collapse: collapse; border-bottom: 1px solid #ef4444; margin-bottom: 14px; }
      table.encabezado td { padding: 0; vertical-align: middle; }
      table.encabezado img { height: 92px; width: 140px; display: block; }
      h1 { font-size: 15px; font-weight: 900; letter-spacing: 2px; margin: 0 0 6px; text-transform: uppercase; }
      h2 { font-size: 12px; font-weight: 600; letter-spacing: 1px; color: #475569; margin: 0 0 4px; text-transform: uppercase; }
      h3 { font-size: 11px; font-weight: 700; letter-spacing: 1px; color: #1f2937; margin: 0; text-transform: uppercase; }

      .identificacion { margin-bottom: 14px; }
      .carrera { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px;
                 border-bottom: 2px solid #000; padding: 0 40px 2px 0; display: inline-block; }
      .dato { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; margin-top: 6px; color: #334155; }

      .edificio { margin-bottom: 10px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; page-break-inside: avoid; }
      .edificio-nombre { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .4px; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
      .grupo { margin: 4px 0; line-height: 1.35; }
      .etiqueta { display: inline-block; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: .5px; color: #475569; min-width: 150px; }
      .valor { font-size: 10px; color: #0f172a; }
      .vacio { font-size: 10px; font-style: italic; color: #64748b; padding: 10px 0; }

      .pie { margin-top: 24px; border-top: 1px solid #ef4444; padding-top: 12px; text-align: center;
             font-size: 9px; color: #6b7280; }
    </style></head><body>
    ${resumenes.length ? resumenes.map(resumen => paginaDeCarrera(resumen, incluirPie)).join('')
      : '<p style="padding:40px;text-align:center;color:#64748b">Sin carreras con clases programadas.</p>'}
  </body></html>`);
  documento.close();

  setTimeout(() => {
    marco.contentWindow?.focus();
    marco.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(marco)) document.body.removeChild(marco);
    }, 1000);
  }, 600);
};

/**
 * Word editable con una hoja por carrera: encabezado institucional, resumen y bloques por
 * edificio con aulas, laboratorios y otros espacios.
 */
export const exportarWordOcupacion = async (
  resumenes: ResumenOcupacionCarrera[],
  nombreArchivo = 'ocupacion-por-carrera.docx',
) => {
  const fuente = 'Times New Roman';
  const texto = (contenido: string, negrita = false, tamano = 18) =>
    new TextRun({ text: contenido, bold: negrita, size: tamano, font: fuente });
  const parrafoCentrado = (contenido: string, negrita = false, tamano = 18) =>
    new Paragraph({
      children: [texto(contenido, negrita, tamano)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
    });
  const sinBorde = { style: BorderStyle.NONE };
  const bordeGris = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };

  let escudo: Uint8Array | null = null;
  try {
    escudo = await imagenComoPng(banderaEspoch);
  } catch {
    // El documento sigue siendo válido con el nombre institucional si la imagen no carga.
  }

  const filaEdificio = (edificio: EdificioOcupado): TableRow => {
    const filas: Paragraph[] = [
      new Paragraph({
        children: [texto(edificio.nombre.toUpperCase(), true, 20)],
        spacing: { after: 60 },
      }),
    ];
    const agregarGrupo = (titulo: string, items: { nombre: string }[]) => {
      if (!items.length) return;
      filas.push(new Paragraph({
        children: [
          texto(`${titulo} (${items.length}): `, true, 16),
          texto(items.map(i => i.nombre).join(' · '), false, 16),
        ],
        spacing: { after: 40 },
      }));
    };
    agregarGrupo('AULAS', edificio.aulas);
    agregarGrupo('LABORATORIOS', edificio.laboratorios);
    agregarGrupo('OTROS ESPACIOS', edificio.otros);

    return new TableRow({
      children: [new TableCell({
        width: { size: 100, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlignTable.CENTER,
        borders: { top: bordeGris, bottom: bordeGris, left: bordeGris, right: bordeGris },
        margins: { top: 120, bottom: 120, left: 180, right: 180 },
        children: filas,
      })],
    });
  };

  const hijos: FileChild[] = [];

  resumenes.forEach((resumen, indice) => {
    if (indice > 0) hijos.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 0 } }));

    // Encabezado institucional (escudo + títulos).
    hijos.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [2600, 7800, 1600],
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
                ? [new ImageRun({ type: 'png', data: escudo, transformation: { width: 140, height: 90 } })]
                : [texto('ESPOCH', true, 22)],
            })],
          }),
          new TableCell({
            borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde },
            verticalAlign: VerticalAlignTable.CENTER,
            children: [
              parrafoCentrado('ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO', true, 26),
              parrafoCentrado('FACULTAD DE INFORMÁTICA Y ELECTRÓNICA', true, 22),
              parrafoCentrado('OCUPACIÓN DE EDIFICIOS POR CARRERA', true, 20),
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
      spacing: { after: 120 },
    }));

    hijos.push(new Paragraph({
      children: [texto(resumen.carrera.toUpperCase(), true, 26)],
      spacing: { after: 60 },
    }));
    hijos.push(new Paragraph({
      children: [texto(
        `TOTAL: ${resumen.totalEspacios} ESPACIOS · ${resumen.totalAulas} AULAS · ${resumen.totalLaboratorios} LABORATORIOS · ${resumen.edificios.length} EDIFICIOS`,
        true,
        18,
      )],
      spacing: { after: 160 },
    }));

    if (resumen.edificios.length) {
      hijos.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: resumen.edificios.map(filaEdificio),
        borders: {
          top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde,
          insideHorizontal: sinBorde, insideVertical: sinBorde,
        },
      }));
    } else {
      hijos.push(new Paragraph({
        children: [texto('Esta carrera no tiene clases programadas en el período actual.', false, 18)],
        spacing: { after: 60 },
      }));
    }
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
          size: { width: 11906, height: 16838 },
          margin: { top: 720, bottom: 900, left: 900, right: 900, footer: 320 },
        },
      },
      footers: { default: pie },
      children: hijos.length ? hijos : [new Paragraph({ children: [texto('Sin carreras con clases programadas.', false, 18)] })],
    }],
  });

  const url = URL.createObjectURL(await Packer.toBlob(documento));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
