import { renderToStaticMarkup } from 'react-dom/server';
import { AlignmentType, BorderStyle, Document, Footer, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, VerticalAlignTable, WidthType, type FileChild } from 'docx';
import { PlantillaPDF } from '../components/Horarios/PlantillaPDF';
import { diasFormales, horas, rangoIncluyeBloque, etiquetaPaoParalelo, type CamposClase } from '../components/Horarios/horariosData';
import { mismoDia } from '../../../lib/texto';
import banderaEspoch from '../../../assets/Bandera-ESPOCH-HORARIOS.webp';
import type { ClaseUI } from '../components/Horarios/mapearClases';

export interface UbicacionHorario {
  edificio: { id: string; nombre: string };
  espacio: { id: string; id_edificio: string; nombre: string };
}

export interface OpcionesHorario {
  orientation: 'vertical' | 'horizontal';
  paperSize: 'A4' | 'Carta';
  typography: string;
  documentFontSize: number;
  headerImg: string;
  footerImg: string;
  exportPeriodo: string;
  clases: ClaseUI[];
  includeFooter: boolean;
  camposClase: CamposClase;
  carreraId?: string;
}

export const ubicacionesConClases = (
  edificios: UbicacionHorario['edificio'][],
  espacios: UbicacionHorario['espacio'][],
  clases: ClaseUI[],
  edificioId?: string,
): UbicacionHorario[] => {
  const usados = new Set(clases.map(clase => clase.idEspacio).filter(Boolean));
  return [...edificios]
    .filter(edificio => !edificioId || edificio.id === edificioId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    .flatMap(edificio => [...espacios]
      .filter(espacio => espacio.id_edificio === edificio.id && usados.has(espacio.id))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map(espacio => ({ edificio, espacio })));
};

const aPngDataUri = (url: string): Promise<string> => {
    if (url.startsWith('data:image/png')) return Promise.resolve(url);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Sin contexto 2d')); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error(`No se pudo cargar ${url}`));
      img.src = url;
    });
  };

export const exportarHorariosWord = async (
  ubicaciones: UbicacionHorario[],
  nombreArchivo: string,
  opciones: OpcionesHorario & { carreraId?: string },
) => {
    const { typography, documentFontSize, orientation, paperSize, headerImg, footerImg, exportPeriodo, clases, camposClase, includeFooter, carreraId = '' } = opciones;
    const fuente = typography || 'Arial';
    // docx mide el tamaño de fuente en medios puntos; el número del panel está en puntos.
    const tamano = documentFontSize;
    const linea = (texto: string, negrita = false, size = tamano * 2) =>
      new TextRun({ text: texto, bold: negrita, size, font: fuente });
    const parrafo = (texto: string, negrita = false, size = tamano * 2) =>
      new Paragraph({ children: [linea(texto, negrita, size)], spacing: { before: 0, after: 0 }, alignment: AlignmentType.CENTER });
    const borde = { style: BorderStyle.SINGLE, size: 5, color: '222222' };
    const celda = (renglones: { texto: string; negrita?: boolean; pao?: boolean }[]) => new TableCell({
      children: renglones.length ? renglones.map(r => {
        if (!r.pao) return parrafo(r.texto, r.negrita);
        const anchoPt = orientation === 'horizontal' ? 139 : 94;
        const puntos = Math.min(tamano, anchoPt / (r.texto.length * 0.55));
        return parrafo(r.texto.replaceAll(' ', '\u00a0'), false, Math.max(10, Math.floor(puntos * 2)));
      }) : [parrafo('')],
      borders: { top: borde, bottom: borde, left: borde, right: borde },
      margins: { top: 35, bottom: 35, left: 35, right: 35 },
    });
    const png = async (url: string) => {
      const uri = await aPngDataUri(url);
      return Uint8Array.from(atob(uri.split(',')[1]), char => char.charCodeAt(0));
    };
    let escudo: Uint8Array | null = null;
    try { escudo = await png(headerImg || banderaEspoch); } catch { /* Título sin imagen si falla. */ }
    const hijos: FileChild[] = [];

    ubicaciones.forEach(({ edificio, espacio }, indice) => {
      if (indice > 0) hijos.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 0 } }));
      const sinBorde = { style: BorderStyle.NONE };
      const lineaRoja = { style: BorderStyle.SINGLE, size: 6, color: 'EF4444' };
      const bordesEncabezado = { top: sinBorde, left: sinBorde, right: sinBorde, bottom: sinBorde };
      const anchoEncabezado = orientation === 'horizontal' ? [3100, 9300, 3100] : [2500, 5600, 2500];
      hijos.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnWidths: anchoEncabezado,
        borders: { top: sinBorde, bottom: sinBorde, left: sinBorde, right: sinBorde, insideHorizontal: sinBorde, insideVertical: sinBorde },
        rows: [new TableRow({ children: [
          new TableCell({
            borders: bordesEncabezado, verticalAlign: VerticalAlignTable.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.LEFT, children: escudo ? [new ImageRun({ type: 'png', data: escudo, transformation: orientation === 'horizontal' ? { width: 190, height: 115 } : { width: 150, height: 92 } })] : [linea('ESPOCH', true)] })],
          }),
          new TableCell({
            borders: bordesEncabezado, verticalAlign: VerticalAlignTable.CENTER,
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [linea('ESCUELA SUPERIOR POLITÉCNICA DE CHIMBORAZO', true, (tamano + 7) * 2)], spacing: { after: 40 } }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [linea('FACULTAD DE INFORMÁTICA Y ELECTRÓNICA', true, (tamano + 3) * 2)] }),
            ],
          }),
          new TableCell({ borders: bordesEncabezado, children: [new Paragraph('')] }),
        ] })],
      }));
      hijos.push(new Paragraph({ children: [new TextRun(' ')], border: { bottom: lineaRoja }, spacing: { after: 40 } }));
      hijos.push(new Paragraph({ children: [linea(espacio.nombre.toUpperCase(), true, (tamano + 4) * 2)], spacing: { after: 25 } }));
      hijos.push(new Paragraph({ children: [linea(edificio.nombre.toUpperCase(), true, (tamano + 1) * 2)], spacing: { after: 25 } }));
      hijos.push(new Paragraph({ children: [linea(exportPeriodo, true, (tamano + 1) * 2)], spacing: { after: 100 } }));

      const filas = [new TableRow({ children: ['HORA', ...diasFormales].map(dia => celda([{ texto: dia.toUpperCase(), negrita: true }])) })];
      horas.forEach(hora => {
        const celdas = [celda([{ texto: hora.replaceAll(':', 'H'), negrita: true }])];
        diasFormales.forEach(dia => {
          const clase = clases.find(c => c.idEspacio === espacio.id && mismoDia(c.dia, dia) && rangoIncluyeBloque(c.hora, hora) && (!carreraId || c.idCarrera === carreraId));
          const renglones = clase ? [
            { texto: clase.materia.toUpperCase(), negrita: true },
            ...(camposClase.paoParalelo && etiquetaPaoParalelo(clase.pao, clase.paralelo) ? [{ texto: etiquetaPaoParalelo(clase.pao, clase.paralelo), pao: true }] : []),
            ...(camposClase.carrera && clase.carrera ? [{ texto: clase.carrera.toUpperCase() }] : []),
            ...(camposClase.docente && clase.docente ? [{ texto: clase.docente.toUpperCase() }] : []),
          ] : [];
          celdas.push(celda(renglones));
        });
        filas.push(new TableRow({ children: celdas, cantSplit: true }));
      });
      hijos.push(new Table({ rows: filas, width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: orientation === 'horizontal' ? [1600, 2780, 2780, 2780, 2780, 2780] : [1200, 1880, 1880, 1880, 1880, 1880] }));
    });

    let pie: Footer | undefined;
    if (includeFooter) {
      let contenido: Paragraph;
      if (footerImg) {
        try { contenido = new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ type: 'png', data: await png(footerImg), transformation: { width: 260, height: 45 } })] }); }
        catch { contenido = parrafo('Riobamba - Ecuador', false, Math.max(7, tamano - 2) * 2); }
      } else {
        contenido = new Paragraph({ alignment: AlignmentType.CENTER, children: [linea('Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155.  Riobamba - Ecuador', false, Math.max(7, tamano - 2) * 2)] });
      }
      pie = new Footer({ children: [contenido] });
    }
    const horizontal = orientation === 'horizontal';
    const corto = paperSize === 'Carta' ? 12240 : 11906;
    const largo = paperSize === 'Carta' ? 15840 : 16838;
    const doc = new Document({ sections: [{
      properties: { page: { size: { width: horizontal ? largo : corto, height: horizontal ? corto : largo }, margin: { top: 700, bottom: 1000, left: 650, right: 650, footer: 350 } } },
      footers: pie ? { default: pie } : undefined,
      children: hijos,
    }] });
    const url = URL.createObjectURL(await Packer.toBlob(doc));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };


export const imprimirHorariosPdf = async (ubicaciones: UbicacionHorario[], nombreArchivo: string, opciones: OpcionesHorario) => {
    const { orientation, paperSize, typography, headerImg, footerImg, documentFontSize, exportPeriodo, clases, includeFooter, camposClase } = opciones;
    const documentos = ubicaciones.map(({ edificio, espacio }) => {
      const html = renderToStaticMarkup(
        <PlantillaPDF
          pdfZoom={120} orientation={orientation} paperSize={paperSize} typography={typography}
          headerImg={headerImg} footerImg={footerImg} documentFontSize={documentFontSize}
          exportAula={espacio.nombre} exportAulaId={espacio.id} exportEdificio={edificio.nombre}
          exportPeriodo={exportPeriodo} clases={clases} includeFooter={includeFooter} camposClase={camposClase}
          exportCarrera={opciones.carreraId || ''}
        />
      );
      return `<section class="horario-lote">${html}</section>`;
    }).join('');
    try {

      const isLandscape = orientation === 'horizontal';

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error("Cannot access iframe document");
      }

      const styleTags = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).map(el => el.outerHTML).join('\n');

      iframeDoc.write(`
        <html>
        <head>
          <meta charset="utf-8">
          <title>${nombreArchivo}</title>
          ${styleTags}
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Roboto:wght@400;500;700;900&family=Montserrat:wght@400;500;700;900&family=Open+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page {
              size: ${paperSize === 'Carta' ? 'letter' : 'A4'} ${isLandscape ? 'landscape' : 'portrait'};
              margin: 8mm 14mm;
            }
            * { box-sizing: border-box; transform: none !important; transform-origin: unset !important; }
            html, body { width: 100%; font-size: ${documentFontSize}pt; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
            /* table-layout se deja en AUTO a propósito. Con fixed todas las columnas miden
               igual y, en vertical, las palabras largas se dibujan FUERA de la celda; además la
               columna HORA quedaba tan angosta que el rango horario (que lleva nowrap) se metía
               en LUNES. En auto el navegador reparte según el contenido y eso no pasa. */
            .schedule-table { border-collapse: collapse; width: 100%; }
            /* Red de seguridad por si alguna palabra sigue sin entrar: que se parta antes de
               salirse de su casilla. */
            .schedule-table th, .schedule-table td { overflow-wrap: break-word; }
            .schedule-table th, .schedule-table td { border: 1.5px solid black !important; padding: 2px 3px !important; text-align: center; vertical-align: middle; }
            .schedule-table th { font-weight: 900; text-transform: uppercase; }
            .schedule-table, .schedule-table th, .schedule-table td, .schedule-table td span { font-size: ${documentFontSize}pt !important; }
            .schedule-table td span.pao-linea { display: block !important; width: 100% !important; white-space: nowrap !important; overflow: hidden !important; }
            .schedule-table tr { height: auto !important; }
            .schedule-table td > div { gap: 0 !important; }
            .schedule-table td span { line-height: 1.1 !important; }
            img { max-width: 100%; height: auto; }
            .printable-area table:first-of-type img { height: 96px !important; width: 146px !important; max-height: none !important; }
            .printable-area h1 { font-size: calc(${documentFontSize}pt + 4px) !important; margin-bottom: 8px !important; }
            .printable-area h2 { font-size: calc(${documentFontSize}pt + 1px) !important; }
            .print-footer-source { display: block !important; margin-top: auto !important; padding-top: 4mm !important; break-inside: avoid; page-break-inside: avoid; }
            .printable-area { margin: 0 !important; padding: 0 !important; box-shadow: none !important; min-height: ${isLandscape ? '160mm' : '267mm'} !important; width: 100% !important; }
            /* Antes se aplicaba page-break avoid a TODOS los elementos. Pedirle al navegador
               que no corte nada no evita el corte —el contenido tiene que caber igual—, solo lo
               vuelve impredecible. Ahora se dice donde SI puede cortar: entre filas, nunca dentro
               de una, y la cabecera se repite en cada hoja. */
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            img { page-break-inside: avoid; break-inside: avoid; }
            .horario-lote { break-after: page; page-break-after: always; }
            .horario-lote:last-child { break-after: auto; page-break-after: auto; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="printable-area">
            ${documentos}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                document.querySelectorAll('.flex-shrink-0').forEach(el => { el.style.transform = 'none'; });
                document.querySelectorAll('.pao-linea').forEach(el => {
                  let px = ${documentFontSize} * 96 / 72;
                  el.style.setProperty('font-size', '${documentFontSize}pt', 'important');
                  while (el.scrollWidth > el.clientWidth && px > 5) {
                    px *= 0.95;
                    el.style.setProperty('font-size', px + 'px', 'important');
                  }
                });
              }, 100);
            };
          </script>
        </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1000);
      }, 1500);

    } catch (error) {
      console.error("Error al generar PDF:", error);
      throw error;
    }
  };
