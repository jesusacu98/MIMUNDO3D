import { supabase } from '@/lib/supabaseClient';
import CatalogoClient from './CatalogoClient';
import { getBanners } from '@/lib/banners';
import type { Product } from './types';

// Revalida el catálogo cada 60s para que las ediciones del admin (futuro)
// se reflejen sin necesidad de un nuevo deploy.
export const revalidate = 60;

export default async function Catalogo() {
  const [{ data: categoriesData, error: categoriesError }, { data: productsData, error: productsError }, banners] = await Promise.all([
    supabase.from('product_categories').select('id, name').order('display_order', { ascending: true }),
    supabase
      .from('products')
      .select('id, category_id, name, description, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    getBanners('catalog'),
  ]);

  if (categoriesError) console.error('Error al cargar categorías del catálogo:', categoriesError);
  if (productsError) console.error('Error al cargar productos del catálogo:', productsError);

  const categories = categoriesData ?? [];
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  const products: Product[] = (productsData ?? []).map((p) => ({
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

  const categoryNames = ['Todos', ...categories.map((c) => c.name)];

  return <CatalogoClient products={products} categoryNames={categoryNames} banners={banners} />;
}
