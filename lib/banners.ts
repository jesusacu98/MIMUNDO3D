import { supabase } from '@/lib/supabaseClient';

// Un banner puede mostrarse en varias secciones a la vez (tabla banner_placements):
// home          → slider principal arriba del inicio
// catalog       → slider arriba de /catalogo
// home_category → imagen de una categoría en "Explora por categoría" del inicio
// category_page → slider arriba de /categorias/[categoria]
export type BannerPlacement = 'home' | 'catalog' | 'home_category' | 'category_page';

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  // Categorías para las que aplica en la ubicación consultada (vacío en home/catalog).
  categoryIds: string[];
}

export const PLACEMENT_LABELS: Record<BannerPlacement, string> = {
  home: 'Inicio · banner principal',
  catalog: 'Catálogo',
  home_category: 'Inicio · imagen de categoría',
  category_page: 'Página de categoría',
};

// Ubicaciones que pertenecen a una categoría concreta.
export const CATEGORY_PLACEMENTS: BannerPlacement[] = ['home_category', 'category_page'];

// Clave "placement" o "placement:categoryId": identifica una sección concreta en el formulario.
export function placementKey(placement: BannerPlacement, categoryId?: string | null): string {
  return categoryId ? `${placement}:${categoryId}` : placement;
}

export function parsePlacementKey(key: string): { placement: BannerPlacement; categoryId: string | null } | null {
  const [placement, categoryId] = key.split(':');
  if (!['home', 'catalog', 'home_category', 'category_page'].includes(placement)) return null;
  const needsCategory = CATEGORY_PLACEMENTS.includes(placement as BannerPlacement);
  if (needsCategory !== Boolean(categoryId)) return null;
  return { placement: placement as BannerPlacement, categoryId: categoryId ?? null };
}

// Banners activos de una ubicación, en el orden definido en /admin/banners.
// Las ubicaciones por categoría devuelven todas las categorías: filtra con `categoryIds`.
// Si la tabla aún no existe o falla la consulta, se devuelve [] para no romper la página.
export async function getBanners(placement: BannerPlacement): Promise<Banner[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('id, title, image_url, mobile_image_url, link_url, banner_placements!inner(placement, category_id)')
    .eq('is_active', true)
    .eq('banner_placements.placement', placement)
    .order('display_order', { ascending: true });

  if (error) {
    console.error(`Error al cargar banners (${placement}):`, error);
    return [];
  }

  return (data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    imageUrl: b.image_url,
    mobileImageUrl: b.mobile_image_url,
    linkUrl: b.link_url,
    categoryIds: b.banner_placements.map((p) => p.category_id).filter((id): id is string => Boolean(id)),
  }));
}
