import { supabase } from '../../../lib/supabase';
import { catalogoElectricidad } from '../data/catalogoElectricidad';
import { planImportacionCatalogo, type CategoriaExistente, type DocumentoExistente } from './planImportacionCatalogo';

async function leerTabla<T>(tabla: string, columnas: string): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from(tabla).select(columnas).order('id').range(desde, desde + 999);
    if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
    filas.push(...(data as unknown as T[]));
    if (data.length < 1000) return filas;
  }
}

export async function prepararImportacionCatalogo() {
  const [categorias, documentos] = await Promise.all([
    leerTabla<CategoriaExistente>('series_formatos', 'id,nombre,id_padre,publico'),
    leerTabla<DocumentoExistente>('formatos', 'id,enlace'),
  ]);
  return planImportacionCatalogo(categorias, documentos);
}

export async function importarCatalogoElectricidad(progreso: (texto: string) => void) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Inicia sesión como administrador para importar el catálogo.');
  const plan = await prepararImportacionCatalogo();
  let carpetasCreadas = 0;
  for (const carpeta of plan.carpetas) {
    progreso(`Creando categorías: ${carpetasCreadas + 1} de ${plan.carpetas.length}`);
    const { data, error } = await supabase.from('series_formatos')
      .upsert(carpeta, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (error) throw new Error(`No se pudo crear «${carpeta.nombre}»: ${error.message}. Puedes reintentar; se conservará lo ya guardado.`);
    carpetasCreadas += data.length;
  }
  progreso('Guardando los documentos en sus categorías…');
  const mime: Record<string, string> = {
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    PNG: 'image/png',
  };
  let documentosCreados = 0;
  if (plan.documentos.length) {
    const payload = plan.documentos.map(doc => ({
      id: doc.id, nombre: doc.nombre, id_serie: doc.id_serie,
      tipo: 'ENLACE', estado: 'activo', enlace: doc.enlace,
      descripcion: `${doc.ruta.join(' / ')}. Documento ${doc.extension} del catálogo de Electricidad.`,
      archivo_nombre: `${doc.nombre}.${doc.extension.toLowerCase()}`, tipo_mime: mime[doc.extension],
      creado_por: user.id,
      datos: { fuente: catalogoElectricidad.fuente, fecha_revision: catalogoElectricidad.fechaRevision,
        drive_id: doc.driveId, categoria_origen: doc.categoriaOrigen, descarga_origen: doc.descargaOrigen },
    }));
    const { data, error } = await supabase.from('formatos')
      .upsert(payload, { onConflict: 'id', ignoreDuplicates: true }).select('id');
    if (error) throw new Error(`No se pudieron guardar los documentos: ${error.message}. Puedes reintentar sin duplicar las categorías.`);
    documentosCreados = data.length;
  }
  progreso('Verificando la carga…');
  const verificacion = await prepararImportacionCatalogo();
  if (verificacion.documentos.length) throw new Error('La carga quedó incompleta. Vuelve a importar para completar los documentos pendientes.');
  return { carpetasCreadas, documentosCreados, existentes: plan.existentes };
}
