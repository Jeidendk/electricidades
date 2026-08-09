// Control de frescura de los stores.
//
// Las páginas y los layouts piden los mismos datos (espacios, inventario, recursos…) cada vez que
// se montan, así que una simple navegación disparaba la misma consulta varias veces seguidas.
// Con esto, si los datos se cargaron hace poco, la petición se omite.
//
// Las mutaciones (crear, editar, borrar) deben refrescar con `{ forzar: true }` para no leer
// una copia vieja justo después de escribir.

/** Ventana durante la cual unos datos ya cargados se consideran vigentes. */
export const MS_DE_FRESCURA = 60_000;

export interface OpcionesFetch {
  /** Ignora la caché y consulta siempre. Úsalo después de escribir. */
  forzar?: boolean;
}

/**
 * ¿Hay que consultar al servidor?
 * Sí cuando se fuerza, cuando nunca se cargó o cuando la última carga ya caducó.
 */
export const debeRecargar = (
  ultimaCarga: number | null,
  opciones?: OpcionesFetch,
  ahora: number = Date.now(),
): boolean => {
  if (opciones?.forzar) return true;
  if (ultimaCarga === null) return true;
  return ahora - ultimaCarga >= MS_DE_FRESCURA;
};
