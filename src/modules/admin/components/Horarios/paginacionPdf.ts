/**
 * Cuántas hojas ocupa el horario al imprimirlo.
 *
 * El PDF no lo arma una librería: se manda al diálogo de impresión del navegador, que pagina
 * según el papel y la orientación. Aquí se reproduce esa misma geometría para que la vista
 * previa pueda decir cuántas páginas van a salir y dónde cae cada corte.
 *
 * Es una **estimación fiel, no una garantía**: si el usuario cambia los márgenes o la escala
 * en el diálogo de impresión, el resultado puede diferir en una página.
 */

/** Medidas del papel en milímetros. */
const PAPEL_MM: Record<string, { ancho: number; alto: number }> = {
  A4: { ancho: 210, alto: 297 },
  Carta: { ancho: 216, alto: 279 },
};

/** Márgenes declarados en la regla `@page` al imprimir (15mm arriba/abajo, 25mm a los lados). */
const MARGEN_MM = { vertical: 15, horizontal: 25 };

/** Ancho, en píxeles, con el que se dibuja la hoja en la vista previa. */
export const ANCHO_HOJA_PX: Record<string, number> = { vertical: 800, horizontal: 1300 };

/**
 * Alto de una página, en los mismos píxeles que usa la vista previa.
 * Se deduce del alto/ancho del área imprimible: la hoja de la vista previa representa
 * exactamente el ancho útil del papel, así que la proporción se conserva.
 */
export const altoPaginaEnPx = (paperSize: string, orientation: string): number => {
  const papel = PAPEL_MM[paperSize] ?? PAPEL_MM.A4;
  const esHorizontal = orientation === 'horizontal';

  const anchoPapel = esHorizontal ? papel.alto : papel.ancho;
  const altoPapel = esHorizontal ? papel.ancho : papel.alto;

  const anchoUtil = anchoPapel - MARGEN_MM.horizontal * 2;
  const altoUtil = altoPapel - MARGEN_MM.vertical * 2;

  const anchoHoja = ANCHO_HOJA_PX[esHorizontal ? 'horizontal' : 'vertical'];
  return anchoHoja * (altoUtil / anchoUtil);
};

/** Nunca menos de una página, aunque el documento todavía no se haya medido. */
export const contarPaginas = (altoContenidoPx: number, altoPaginaPx: number): number => {
  if (altoPaginaPx <= 0 || altoContenidoPx <= 0) return 1;
  return Math.max(1, Math.ceil(altoContenidoPx / altoPaginaPx));
};

/** Página (empezando en 1) que corresponde a un desplazamiento del contenedor. */
export const paginaDesdeScroll = (
  scrollTop: number,
  altoPaginaPx: number,
  escala: number,
  totalPaginas: number,
): number => {
  const altoVisible = altoPaginaPx * escala;
  if (altoVisible <= 0) return 1;
  return Math.min(totalPaginas, Math.max(1, Math.floor(scrollTop / altoVisible) + 1));
};
