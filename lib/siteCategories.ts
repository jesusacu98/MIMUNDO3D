import { supabase } from '@/lib/supabaseClient';
import { HOME_CATEGORIES, type HomeCategory } from '@/lib/homeCategories';

// Categorías con página pública (/categorias/[slug]), administrables desde /admin/categorias
// (columnas de supabase/schema_catalog_v8.sql). `showOnHome` decide cuáles salen en "Explora por
// categoría" del inicio.
//
// Si la consulta falla (típicamente porque schema_catalog_v8.sql todavía no se corrió) cae a la
// lista fija de lib/homeCategories.ts en vez de romper el sitio público — mismo criterio de
// "falla abierto" que lib/ideas/settings.ts.

export interface SiteCategory extends HomeCategory {
  showOnHome: boolean;
  /** Imagen elegida en /admin/categorias para su recuadro del inicio (si no hay, se usan los banners). */
  homeImageUrl: string | null;
}

const FALLBACK: SiteCategory[] = HOME_CATEGORIES.map((category) => ({ ...category, showOnHome: true, homeImageUrl: null }));

type CategoryRow = {
  name: string;
  slug: string | null;
  description: string | null;
  headline: string | null;
  show_on_home: boolean;
  home_image_url?: string | null;
};

async function fetchRows(columns: string): Promise<CategoryRow[] | null> {
  const { data, error } = await supabase
    .from('product_categories')
    .select(columns)
    .not('slug', 'is', null)
    .order('display_order', { ascending: true });
  return error || !data ? null : (data as unknown as CategoryRow[]);
}

export async function getSiteCategories(): Promise<SiteCategory[]> {
  // Se intenta con la imagen y, si esa columna todavía no existe, sin ella (así una migración a
  // medias no esconde categorías).
  const rows = (await fetchRows('name, slug, description, headline, show_on_home, home_image_url')) ?? (await fetchRows('name, slug, description, headline, show_on_home'));
  if (!rows) return FALLBACK;

  return rows.map((row) => ({
    slug: row.slug as string,
    dbName: row.name,
    description: row.description ?? '',
    headline: row.headline ?? undefined,
    showOnHome: row.show_on_home,
    homeImageUrl: row.home_image_url ?? null,
  }));
}
