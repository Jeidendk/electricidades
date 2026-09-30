import { catalogoElectricidad } from '../data/catalogoElectricidad.ts';

export interface CategoriaExistente {
  id: string; nombre: string; id_padre: string | null; publico: string | null;
}
export interface DocumentoExistente { id: string; enlace: string | null }
const normalizar = (valor: string) => valor.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** La identidad es el archivo de Drive, aunque cambie /edit, /view o la query. */
export function identidadDocumento(enlace: string | null): string | null {
  if (!enlace) return null;
  try {
    const url = new URL(enlace);
    if (['docs.google.com', 'drive.google.com'].includes(url.hostname)) {
      const id = url.pathname.match(/\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
      if (id) return `drive:${id}`;
    }
    if (url.origin === new URL(catalogoElectricidad.fuente).origin) {
      const id = url.pathname.match(/^\/api\/documents\/([^/]+)$/)?.[1];
      if (id) return `drive:${id}`;
    }
    return enlace;
  } catch { return enlace; }
}

export function planImportacionCatalogo(categorias: CategoriaExistente[], existentes: DocumentoExistente[]) {
  const mapa = new Map<string, string>();
  const nuevas: CategoriaExistente[] = [];
  const ids = new Set(existentes.map(d => d.id));
  const enlaces = new Set(existentes.map(d => identidadDocumento(d.enlace)).filter(Boolean));
  const pendientes = catalogoElectricidad.documentos.filter(d => !ids.has(d.id) && !enlaces.has(`drive:${d.driveId}`));
  // Solo crear carpetas que hacen falta para documentos pendientes.
  const necesarias = new Set<string>();
  for (const doc of pendientes) {
    let id: string | null = doc.id_serie;
    while (id) {
      necesarias.add(id);
      id = catalogoElectricidad.carpetas.find(c => c.id === id)?.id_padre ?? null;
    }
  }
  for (const carpeta of catalogoElectricidad.carpetas) {
    if (!necesarias.has(carpeta.id)) continue;
    const padre = carpeta.id_padre ? mapa.get(carpeta.id_padre)! : null;
    const porId = categorias.find(c => c.id === carpeta.id);
    const coincidencias = categorias.filter(c => c.id_padre === padre && normalizar(c.nombre) === normalizar(carpeta.nombre));
    if (coincidencias.length > 1) throw new Error(`Hay varias categorías llamadas «${carpeta.nombre}». Unifícalas antes de importar.`);
    const existente = porId ?? coincidencias[0];
    if (existente && (existente.publico !== carpeta.publico || existente.id_padre !== padre)) {
      throw new Error(`La categoría «${carpeta.nombre}» ya existe con otro público o ubicación. Revisa su clasificación antes de importar.`);
    }
    const id = existente?.id ?? carpeta.id;
    mapa.set(carpeta.id, id);
    if (!existente) nuevas.push({ ...carpeta, id_padre: padre });
  }
  return {
    carpetas: nuevas,
    documentos: pendientes.map(doc => ({ ...doc, id_serie: mapa.get(doc.id_serie)! })),
    existentes: catalogoElectricidad.documentos.length - pendientes.length,
  };
}
