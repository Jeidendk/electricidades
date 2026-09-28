import banderaEspoch from '../../../assets/Bandera-ESPOCH-HORARIOS.webp';

const escaparHtml = (texto: unknown) =>
  String(texto ?? '').replace(/[&<>]/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[caracter]!));

/**
 * Imprime una tabla con la maqueta institucional: escudo, encabezado de la ESPOCH y pie.
 *
 * Es el mismo camino que usa Horarios para sus PDF —se manda al diálogo de impresión del
 * navegador y el usuario elige "Guardar como PDF"—, pero para reportes que son una lista y no
 * una grilla semanal. El horario por docente tiene su propio generador porque su cuerpo es una
 * grilla de horas por días, que no encaja aquí.
 */
export const exportarTablaPdf = ({
  titulo, subtitulo, cabeceras, filas, apaisado = true,
}: {
  titulo: string;
  subtitulo: string;
  cabeceras: string[];
  filas: string[][];
  /** Horizontal por defecto: estas tablas suelen tener más columnas que alto. */
  apaisado?: boolean;
}) => {
  const marco = document.createElement('iframe');
  marco.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(marco);

  const documento = marco.contentWindow?.document;
  if (!documento) {
    document.body.removeChild(marco);
    throw new Error('No se pudo preparar el documento de impresión.');
  }

  const cuerpo = filas.map(fila => `
    <tr>${fila.map(celda => `<td>${escaparHtml(celda)}</td>`).join('')}</tr>`).join('');

  documento.write(`<!doctype html><html><head><meta charset="utf-8">
    <title>${escaparHtml(titulo)}</title>
    <style>
      @page { size: A4 ${apaisado ? 'landscape' : 'portrait'}; margin: 12mm 14mm; }
      body { font-family: "Times New Roman", Times, serif; color: #0f172a; margin: 0; font-size: 10px; }

      table.encabezado { width: 100%; border-collapse: collapse; border-bottom: 1px solid #ef4444; margin-bottom: 10px; }
      table.encabezado td { padding: 0; vertical-align: middle; }
      table.encabezado img { height: 96px; width: 146px; display: block; }
      h1 { font-size: 15px; font-weight: 900; letter-spacing: 2px; margin: 0 0 8px; text-transform: uppercase; }
      h2 { font-size: 12px; font-weight: 600; letter-spacing: 1px; color: #475569; margin: 0 0 6px; text-transform: uppercase; }

      .identificacion { margin-bottom: 10px; }
      .titulo { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px;
                border-bottom: 2px solid #000; padding: 0 40px 2px 0; display: inline-block; }
      .dato { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; margin-top: 6px; }

      table.datos { width: 100%; border-collapse: collapse; }
      table.datos th, table.datos td { border: 1px solid #000; padding: 4px 5px; text-align: left; }
      table.datos th { font-weight: 900; text-transform: uppercase; font-size: 9px; background: #ececec; }

      /* La cabecera se repite en cada hoja y nunca se corta una fila por la mitad. */
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }

      .pie { margin-top: 26px; border-top: 1px solid #ef4444; padding-top: 14px; text-align: center;
             font-size: 9px; color: #6b7280; }
    </style></head><body>
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
      <span class="titulo">${escaparHtml(titulo)}</span>
      <div class="dato">${escaparHtml(subtitulo)}</div>
    </div>

    <table class="datos">
      <thead><tr>${cabeceras.map(c => `<th>${escaparHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>${cuerpo}</tbody>
    </table>

    <div class="pie">
      Panamericana Sur Km. 1 ½. | Teléfono: 593 (03) 2 998-200 | Telefax: (03) 2 317-001 | Código Postal: EC060155.<br/>
      Riobamba - Ecuador
    </div>
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
