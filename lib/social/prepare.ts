import sharp from 'sharp';
import { deleteAdImagesIfManaged, uploadAdJpeg } from '@/lib/storage';

/**
 * Convierte las láminas del anuncio (PNG) a JPEG y las sube a una carpeta temporal pública, porque
 * Instagram sólo acepta JPEG y descarga la imagen por URL. `cleanup()` borra las copias temporales.
 */
export async function prepareJpegUrls(imageUrls: string[], baseName: string): Promise<{ urls: string[]; cleanup: () => Promise<void> }> {
  const urls: string[] = [];
  const cleanup = () => deleteAdImagesIfManaged(urls);

  try {
    for (let i = 0; i < imageUrls.length; i++) {
      const response = await fetch(imageUrls[i]);
      if (!response.ok) throw new Error(`No se pudo leer la lámina ${i + 1} del anuncio (${response.status}).`);
      const jpeg = await sharp(Buffer.from(await response.arrayBuffer()))
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
      const uploaded = await uploadAdJpeg(jpeg, `${baseName}-${i + 1}`);
      if ('error' in uploaded) throw new Error(uploaded.error);
      urls.push(uploaded.url);
    }
  } catch (error) {
    await cleanup();
    throw error;
  }
  return { urls, cleanup };
}
