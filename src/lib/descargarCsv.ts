/**
 * Descarga una tabla como CSV.
 *
 * Se antepone el BOM de UTF-8 porque Excel, sin él, abre los acentos y las ñ como símbolos.
 * Cada celda va entre comillas y las comillas internas se duplican, que es como el formato
 * escapa un valor que contiene comas o saltos de línea.
 */
export const descargarCsv = (nombreArchivo: string, cabeceras: string[], filas: string[][]) => {
  const escapar = (celda: string) => `"${String(celda ?? '').replace(/"/g, '""')}"`;
  const contenido = [cabeceras, ...filas].map(fila => fila.map(escapar).join(',')).join('\n');

  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
};
