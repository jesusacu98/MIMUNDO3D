import { supabase } from '@/lib/supabaseClient';
import type { Product } from '@/app/catalogo/types';

const LIMIT = 12;

const COLUMNS =
  'id, category_id, name, description, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option';

type FeaturedFlag = 'is_trending' | 'is_new' | 'is_promo';

async function fetchFlagged(flag: FeaturedFlag, order: 'display_order' | 'created_at'): Promise<Product[]> {
  const [{ data: productsData, error }, { data: categoriesData }] = await Promise.all([
    supabase
      .from('products')
      .select(COLUMNS)
      .eq('is_active', true)
      .eq(flag, true)
      .order(order, { ascending: order === 'display_order' })
      .limit(LIMIT),
    supabase.from('product_categories').select('id, name'),
  ]);

  if (error) console.error(`Error al cargar productos destacados (${flag}):`, error);

  const categoryNameById = new Map((categoriesData ?? []).map((c) => [c.id, c.name]));

  return (productsData ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: categoryNameById.get(p.category_id) ?? '',
    description: p.description,
    price: p.price,
    isStartingPrice: p.is_starting_price,
    image: p.image_url,
    images: [p.image_url],
    personalizable: p.is_personalizable,
    businessInfo: p.has_business_info,
    characterOption: p.has_character_option,
  }));
}

// Productos marcados en /admin/productos para los carruseles del inicio.
export async function getFeaturedProducts() {
  const [trending, news, promos] = await Promise.all([
    fetchFlagged('is_trending', 'display_order'),
    fetchFlagged('is_new', 'created_at'),
    fetchFlagged('is_promo', 'display_order'),
  ]);
  return { trending, news, promos };
}
