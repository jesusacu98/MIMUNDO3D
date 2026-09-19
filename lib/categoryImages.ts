import fs from 'node:fs';
import path from 'node:path';

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// Bucket público de Supabase Storage para imágenes del sitio y, por categoría
// del home, el archivo que se usa como portada. Si una categoría no está aquí
// se busca public/categorias/<slug>.<ext>.
const SITE_IMAGES_BUCKET = 'imagenes_sitio';
const STORAGE_IMAGES: Record<string, string> = {
  negocios: 'Banner de productos para Negocios.png',
};

async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

// Devuelve la URL/ruta de la portada de la categoría, o null si no hay una
// disponible (el home muestra entonces un espacio reservado, no una imagen rota).
export async function getCategoryImage(slug: string): Promise<string | null> {
  const storageFile = STORAGE_IMAGES[slug];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (storageFile && supabaseUrl) {
    const url = `${supabaseUrl}/storage/v1/object/public/${SITE_IMAGES_BUCKET}/${encodeURIComponent(storageFile)}`;
    if (await isReachable(url)) return url;
  }

  for (const ext of EXTENSIONS) {
    if (fs.existsSync(path.join(process.cwd(), 'public', 'categorias', `${slug}.${ext}`))) {
      return `/categorias/${slug}.${ext}`;
    }
  }
  return null;
}
