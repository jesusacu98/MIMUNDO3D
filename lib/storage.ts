import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const CATALOG_BUCKET = 'catalogos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Las fotos del celular pesan varios MB. Como las imágenes se sirven directo desde Storage (el
// optimizador de Vercel está desactivado, ver next.config.ts: su cuota gratis se agotó y devolvía
// 402 al azar), cada subida se reduce aquí: lado máximo, orientación EXIF aplicada y recompresión
// en el mismo formato (así la extensión y el tipo no cambian). SVG y GIF se suben tal cual.
async function compressForWeb(file: File, maxSide: number): Promise<{ body: File | Buffer; contentType: string; name: string }> {
  const passthrough = { body: file, contentType: file.type, name: file.name };
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return passthrough;

  try {
    const pipeline = sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true });

    if (file.type === 'image/png') {
      return { body: await pipeline.png({ palette: true, quality: 90, effort: 8, compressionLevel: 9 }).toBuffer(), contentType: 'image/png', name: file.name };
    }
    if (file.type === 'image/webp') {
      return { body: await pipeline.webp({ quality: 80 }).toBuffer(), contentType: 'image/webp', name: file.name };
    }
    // JPEG y cualquier otro formato de foto (HEIC, AVIF…) quedan como JPEG.
    const base = file.name.replace(/\.[^.]+$/, '') || 'imagen';
    return { body: await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer(), contentType: 'image/jpeg', name: `${base}.jpg` };
  } catch {
    // Si sharp no puede leer el archivo se sube el original en vez de perder la subida.
    return passthrough;
  }
}

function slugifyFileName(originalName: string): string {
  const lastDot = originalName.lastIndexOf('.');
  const base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const ext = lastDot > 0 ? originalName.slice(lastDot + 1).toLowerCase() : 'jpg';

  const slug =
    base
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // quitar acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'imagen';

  // Sufijo corto para evitar choques de nombre entre subidas distintas.
  const suffix = Date.now().toString(36);
  return `${slug}-${suffix}.${ext}`;
}

export async function uploadCatalogImage(file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'El archivo debe ser una imagen.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'La imagen no puede pesar más de 10MB.' };
  }

  const prepared = await compressForWeb(file, 1400);
  const fileName = slugifyFileName(prepared.name);

  const { error } = await supabaseAdmin.storage.from(CATALOG_BUCKET).upload(fileName, prepared.body, {
    contentType: prepared.contentType,
    upsert: false,
  });

  if (error) {
    return { error: 'No se pudo subir la imagen: ' + error.message };
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(CATALOG_BUCKET).getPublicUrl(fileName);

  return { url: publicUrl };
}

// Borra la imagen anterior sólo si vivía en nuestro bucket de Storage;
// si era una ruta local (/catalogo/1.jpg) no se toca.
export async function deleteCatalogImageIfManaged(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;

  const marker = `/storage/v1/object/public/${CATALOG_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex === -1) return;

  const objectPath = decodeURIComponent(imageUrl.slice(markerIndex + marker.length));
  if (!objectPath) return;

  await supabaseAdmin.storage.from(CATALOG_BUCKET).remove([objectPath]);
}

// Logos de negocio de clientes NFC: mismo bucket público que el catálogo,
// bajo su propia carpeta para no mezclarse con imágenes de producto.
const CLIENT_LOGO_PREFIX = 'logos/';

export async function uploadClientLogo(file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'El logo debe ser una imagen.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'El logo no puede pesar más de 10MB.' };
  }

  const prepared = await compressForWeb(file, 800);
  const objectPath = CLIENT_LOGO_PREFIX + slugifyFileName(prepared.name);

  const { error } = await supabaseAdmin.storage.from(CATALOG_BUCKET).upload(objectPath, prepared.body, {
    contentType: prepared.contentType,
    upsert: false,
  });

  if (error) {
    return { error: 'No se pudo subir el logo: ' + error.message };
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(CATALOG_BUCKET).getPublicUrl(objectPath);

  return { url: publicUrl };
}

export async function deleteClientLogoIfManaged(logoUrl: string | null | undefined): Promise<void> {
  await deleteCatalogImageIfManaged(logoUrl);
}

// Banners administrables: bucket público propio (imagenes_sitio), carpeta banners/.
// Los archivos subidos a mano a la raíz del bucket (ej. la portada de Negocios) no se tocan.
const SITE_IMAGES_BUCKET = 'imagenes_sitio';
const BANNER_PREFIX = 'banners/';

export async function uploadBannerImage(file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'El banner debe ser una imagen.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'La imagen del banner no puede pesar más de 10MB.' };
  }

  const prepared = await compressForWeb(file, 1920);
  const objectPath = BANNER_PREFIX + slugifyFileName(prepared.name);

  const { error } = await supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).upload(objectPath, prepared.body, {
    contentType: prepared.contentType,
    upsert: false,
  });

  if (error) {
    return { error: 'No se pudo subir la imagen del banner: ' + error.message };
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).getPublicUrl(objectPath);

  return { url: publicUrl };
}

// Borra la imagen sólo si la subió este admin (banners/…), ya sea en imagenes_sitio o en
// catalogos (donde se guardaban las primeras). Archivos subidos a mano no se tocan.
export async function deleteBannerImageIfManaged(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;

  for (const bucket of [SITE_IMAGES_BUCKET, CATALOG_BUCKET]) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const markerIndex = imageUrl.indexOf(marker);
    if (markerIndex === -1) continue;

    const objectPath = decodeURIComponent(imageUrl.slice(markerIndex + marker.length));
    if (!objectPath.startsWith(BANNER_PREFIX)) return;

    await supabaseAdmin.storage.from(bucket).remove([objectPath]);
    return;
  }
}

// Imagen del recuadro de una categoría en el inicio: mismo bucket que los banners, carpeta categorias/.
const CATEGORY_PREFIX = 'categorias/';

export async function uploadCategoryImage(file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'La imagen de la categoría debe ser una imagen.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'La imagen de la categoría no puede pesar más de 10MB.' };
  }

  const prepared = await compressForWeb(file, 1920);
  const objectPath = CATEGORY_PREFIX + slugifyFileName(prepared.name);

  const { error } = await supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).upload(objectPath, prepared.body, {
    contentType: prepared.contentType,
    upsert: false,
  });

  if (error) {
    return { error: 'No se pudo subir la imagen de la categoría: ' + error.message };
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).getPublicUrl(objectPath);

  return { url: publicUrl };
}

// Sólo borra lo que subió este admin (categorias/…); una URL pegada a mano no se toca.
export async function deleteCategoryImageIfManaged(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl) return;

  const marker = `/storage/v1/object/public/${SITE_IMAGES_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);
  if (markerIndex === -1) return;

  const objectPath = decodeURIComponent(imageUrl.slice(markerIndex + marker.length));
  if (!objectPath.startsWith(CATEGORY_PREFIX)) return;

  await supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).remove([objectPath]);
}

// Láminas de los anuncios generados en /admin/anuncios: mismo bucket que los banners, carpeta anuncios/.
const AD_PREFIX = 'anuncios/';

export async function uploadAdImage(png: Buffer, baseName: string): Promise<{ url: string } | { error: string }> {
  const objectPath = AD_PREFIX + slugifyFileName(baseName + '.png');

  const { error } = await supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).upload(objectPath, png, {
    contentType: 'image/png',
    upsert: false,
  });

  if (error) {
    return { error: 'No se pudo guardar la imagen del anuncio: ' + error.message };
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).getPublicUrl(objectPath);

  return { url: publicUrl };
}

// Sólo borra lo que generó este módulo (anuncios/…).
export async function deleteAdImagesIfManaged(imageUrls: string[]): Promise<void> {
  const marker = `/storage/v1/object/public/${SITE_IMAGES_BUCKET}/`;
  const paths = imageUrls
    .map((url) => {
      const i = url.indexOf(marker);
      return i === -1 ? '' : decodeURIComponent(url.slice(i + marker.length));
    })
    .filter((p) => p.startsWith(AD_PREFIX));
  if (paths.length === 0) return;
  await supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).remove(paths);
}
