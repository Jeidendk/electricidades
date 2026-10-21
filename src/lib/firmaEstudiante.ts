/**
 * La imagen de firma del estudiante, guardada en privado.
 *
 * Antes vivía en `localStorage` bajo la clave compartida `espoch_student_firma`: en un
 * laboratorio, quien entraba después heredaba la firma de quien se acababa de ir, y bastaba
 * abrir el navegador para copiarla. Ahora va al bucket **privado** `firmas`, en una carpeta con
 * el id del usuario, y las políticas de la migración 0045 impiden que nadie salga de la suya.
 *
 * Es una IMAGEN de firma, no una firma electrónica certificada: no acredita identidad ni
 * integridad del documento. Los textos de la interfaz lo dicen con esas palabras.
 */
import { supabase } from './supabase';

/** Lo que el bucket acepta; el mismo límite está declarado en la migración. */
export const TIPOS_DE_FIRMA = ['image/png', 'image/jpeg', 'image/webp'];
export const TAMANO_MAXIMO_FIRMA = 2 * 1024 * 1024;

/** Lado mayor de la imagen guardada. Una firma más grande no se ve mejor y pesa en cada versión. */
const LADO_MAXIMO = 600;
const CALIDAD_JPEG = 0.85;

/** Devuelve el motivo del rechazo, o null si el archivo sirve. */
export const motivoDeRechazoDeFirma = (archivo: File): string | null => {
  if (!TIPOS_DE_FIRMA.includes(archivo.type)) {
    return 'La firma debe ser una imagen PNG, JPG o WEBP.';
  }
  if (archivo.size > TAMANO_MAXIMO_FIRMA) {
    return 'La imagen supera los 2 MB. Usa una foto más pequeña o recórtala.';
  }
  return null;
};

const leerComoDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(new Error('No se pudo leer la imagen.'));
    lector.readAsDataURL(blob);
  });

/**
 * Reduce la imagen y la aplana sobre blanco.
 *
 * El fondo importa: un PNG transparente se ve bien en pantalla y sale con un recuadro negro en
 * algunos visores de PDF.
 */
const normalizar = (dataUrl: string): Promise<Blob> =>
  new Promise((resolver, rechazar) => {
    const imagen = new Image();
    imagen.onload = () => {
      let ancho = imagen.width;
      let alto = imagen.height;
      if (ancho > LADO_MAXIMO || alto > LADO_MAXIMO) {
        const escala = LADO_MAXIMO / Math.max(ancho, alto);
        ancho = Math.round(ancho * escala);
        alto = Math.round(alto * escala);
      }
      const lienzo = document.createElement('canvas');
      lienzo.width = ancho;
      lienzo.height = alto;
      const contexto = lienzo.getContext('2d');
      if (!contexto) {
        rechazar(new Error('El navegador no pudo procesar la imagen.'));
        return;
      }
      contexto.fillStyle = '#FFFFFF';
      contexto.fillRect(0, 0, ancho, alto);
      contexto.drawImage(imagen, 0, 0, ancho, alto);
      lienzo.toBlob(
        blob => (blob ? resolver(blob) : rechazar(new Error('No se pudo convertir la imagen.'))),
        'image/jpeg',
        CALIDAD_JPEG,
      );
    };
    imagen.onerror = () => rechazar(new Error('El archivo no es una imagen válida.'));
    imagen.src = dataUrl;
  });

/** Ruta dentro del bucket. El primer tramo es el id del usuario: es lo que filtra la política. */
const rutaDeFirma = (usuarioId: string) => `${usuarioId}/firma.jpg`;

/**
 * Sube (o reemplaza) la firma del usuario y deja la ruta en su ficha.
 * Devuelve la imagen ya normalizada para mostrarla sin volver a descargarla.
 */
export const guardarFirma = async (
  usuarioId: string,
  archivo: File,
): Promise<{ path: string; dataUrl: string }> => {
  const motivo = motivoDeRechazoDeFirma(archivo);
  if (motivo) throw new Error(motivo);

  const normalizada = await normalizar(await leerComoDataUrl(archivo));
  const path = rutaDeFirma(usuarioId);

  const { error: errorSubida } = await supabase.storage
    .from('firmas')
    .upload(path, normalizada, { contentType: 'image/jpeg', upsert: true });
  if (errorSubida) throw errorSubida;

  const { error: errorFicha } = await supabase
    .from('usuarios')
    .update({ firma_path: path })
    .eq('id', usuarioId);
  if (errorFicha) throw errorFicha;

  return { path, dataUrl: await leerComoDataUrl(normalizada) };
};

/**
 * Descarga la firma guardada. Devuelve null cuando no hay ninguna, que es un caso normal y no
 * un error: firmar a mano sobre el papel impreso es una opción legítima.
 */
export const leerFirma = async (path: string | null | undefined): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('firmas').download(path);
  if (error || !data) return null;
  return leerComoDataUrl(data);
};

/**
 * Borra la firma del perfil.
 *
 * No toca los trámites ya presentados: cada versión guarda su propia copia de la imagen, así
 * que lo que se entregó sigue igual. Es justo lo que se espera de un documento presentado.
 */
export const eliminarFirma = async (usuarioId: string): Promise<void> => {
  const { error: errorArchivo } = await supabase.storage
    .from('firmas')
    .remove([rutaDeFirma(usuarioId)]);
  if (errorArchivo) throw errorArchivo;

  const { error: errorFicha } = await supabase
    .from('usuarios')
    .update({ firma_path: null })
    .eq('id', usuarioId);
  if (errorFicha) throw errorFicha;
};
