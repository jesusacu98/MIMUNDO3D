import { supabaseAdmin } from '@/lib/supabaseAdmin';

const CATALOG_BUCKET = 'catalogos';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

  const fileName = slugifyFileName(file.name);

  const { error } = await supabaseAdmin.storage.from(CATALOG_BUCKET).upload(fileName, file, {
    contentType: file.type,
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

  const objectPath = CLIENT_LOGO_PREFIX + slugifyFileName(file.name);

  const { error } = await supabaseAdmin.storage.from(CATALOG_BUCKET).upload(objectPath, file, {
    contentType: file.type,
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

  const objectPath = BANNER_PREFIX + slugifyFileName(file.name);

  const { error } = await supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).upload(objectPath, file, {
    contentType: file.type,
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

  const objectPath = CATEGORY_PREFIX + slugifyFileName(file.name);

  const { error } = await supabaseAdmin.storage.from(SITE_IMAGES_BUCKET).upload(objectPath, file, {
    contentType: file.type,
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
