import { supabase } from './supabase';

// Convierte una imagen a WebP en el navegador (canvas) para reducir peso antes de subir.
// - Redimensiona si excede maxDim (lado mayor).
// - Si no es imagen o falla la conversión, devuelve el archivo original.
async function toWebp(file: File, quality = 0.8, maxDim = 1600): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/webp' && file.size < 300 * 1024) {
    return file; // no-imagen, o ya webp pequeño → sin cambios
  }
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    if (Math.max(width, height) > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality));
    if (!blob) return file;
    // Si el webp no reduce peso, conserva el original.
    if (blob.size >= file.size) return file;
    const nombre = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return new File([blob], nombre, { type: 'image/webp' });
  } catch {
    return file;
  }
}

export async function uploadImage(file: File, folder: string = 'general'): Promise<string | null> {
  try {
    const optimized = await toWebp(file);
    const fileExt = optimized.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('imagenes')
      .upload(filePath, optimized, {
        cacheControl: '3600',
        upsert: false,
        contentType: optimized.type,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from('imagenes').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (error) {
    console.error('Unexpected error uploading image:', error);
    return null;
  }
}
