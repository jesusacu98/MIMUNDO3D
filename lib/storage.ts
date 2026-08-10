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
