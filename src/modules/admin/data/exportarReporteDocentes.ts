import { CABECERAS_CSV_DOCENTES, filasCsvDocentes, type ResumenDocente } from './reporteDocentes';

/** Anchos de columna del Excel, en caracteres, en el orden de las cabeceras. */
const ANCHOS_EXCEL = [34, 12, 12, 12, 8, 38, 8, 10, 28, 16, 26];

/**
 * Genera el .xlsx con una fila por bloque de clase.
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
  const hoja = libro.addWorksheet('Carga docente');

  hoja.addRow(CABECERAS_CSV_DOCENTES);
  hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1F26' } };
  hoja.getRow(1).alignment = { vertical: 'middle' };
  hoja.columns = ANCHOS_EXCEL.map(width => ({ width }));

  for (const fila of filasCsvDocentes(resumenes, nombreEdificio)) hoja.addRow(fila);

  // Congelar la cabecera y activar el autofiltro: con cientos de bloques, revisar sin esto
  // obliga a desplazarse a ciegas.
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  hoja.autoFilter = { from: 'A1', to: { row: 1, column: CABECERAS_CSV_DOCENTES.length } };

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

const escaparHtml = (texto: string) =>
  String(texto ?? '').replace(/[&<>]/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[caracter]!));

/**
 * Abre el diálogo de impresión con el reporte maquetado, que es como Horarios produce sus PDF:
 * el navegador pagina y el usuario elige "Guardar como PDF".
 *
 * Se imprime un bloque por docente, con su horario en una tabla y la cabecera repetida en cada
 * hoja, en vez de un listado plano de cientos de filas.
 */
export const exportarPdfDocentes = (
  resumenes: ResumenDocente[],
  nombreEdificio: (id: string) => string,
  subtitulo: string,
) => {
  const totalHoras = resumenes.reduce((suma, resumen) => suma + resumen.horasSemana, 0);

  const bloquesDe = (resumen: ResumenDocente) => resumen.bloques.map(bloque => `
    <tr>
      <td>${escaparHtml(bloque.dia)}</td>
      <td>${escaparHtml(`${bloque.horaInicio} - ${bloque.horaFin}`)}</td>
      <td class="izq">${escaparHtml(bloque.materia)}</td>
      <td>${bloque.pao ?? '—'}</td>
      <td>${bloque.paralelo ?? '—'}</td>
      <td class="izq">${escaparHtml(bloque.carrera || '—')}</td>
      <td>${escaparHtml(bloque.aula)}</td>
      <td class="izq">${escaparHtml(nombreEdificio(bloque.edificio))}</td>
    </tr>`).join('');

  const secciones = resumenes.map(resumen => `
    <section>
      <h2>${escaparHtml(resumen.docente)}</h2>
      <p class="meta">
        ${resumen.horasSemana} horas/semana · ${resumen.materias.length}
        ${resumen.materias.length === 1 ? 'materia' : 'materias'}: ${escaparHtml(resumen.materias.join(', '))}
      </p>
      <table>
        <thead>
          <tr><th>Día</th><th>Hora</th><th>Materia</th><th>PAO</th><th>Paralelo</th><th>Carrera</th><th>Aula</th><th>Edificio</th></tr>
        </thead>
        <tbody>${bloquesDe(resumen)}</tbody>
      </table>
    </section>`).join('');

  const marco = document.createElement('iframe');
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(marco);

  const documento = marco.contentWindow?.document;
  if (!documento) {
    document.body.removeChild(marco);
    throw new Error('No se pudo preparar el documento de impresión.');
  }

  documento.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>Reporte de carga docente</title>
    <style>
      @page { size: A4 landscape; margin: 14mm 12mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10px; margin: 0; }
      h1 { font-size: 15px; margin: 0 0 2px; }
      .encabezado { border-bottom: 2px solid #b00000; padding-bottom: 6px; margin-bottom: 12px; }
      .encabezado p { margin: 0; color: #555; font-size: 10px; }
      /* Un docente no se parte entre dos hojas si cabe entero en una. */
      section { margin-bottom: 14px; page-break-inside: avoid; }
      h2 { font-size: 11px; margin: 0 0 2px; text-transform: uppercase; }
      .meta { margin: 0 0 5px; color: #555; font-size: 9px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #999; padding: 3px 5px; text-align: center; }
      th { background: #ececec; font-size: 9px; text-transform: uppercase; }
      td.izq { text-align: left; }
      /* La cabecera se repite en cada hoja y nunca se corta una fila por la mitad. */
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    </style></head><body>
    <div class="encabezado">
      <h1>Reporte de carga docente</h1>
      <p>${escaparHtml(subtitulo)} · ${resumenes.length} ${resumenes.length === 1 ? 'docente' : 'docentes'} · ${totalHoras} horas/semana</p>
    </div>
    ${secciones}
  </body></html>`);
  documento.close();

  // El navegador necesita un instante para maquetar antes de abrir el diálogo.
  setTimeout(() => {
    marco.contentWindow?.focus();
    marco.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(marco)) document.body.removeChild(marco);
    }, 1000);
  }, 400);
};
