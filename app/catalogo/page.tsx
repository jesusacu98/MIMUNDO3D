import { supabase } from '@/lib/supabaseClient';
import CatalogoClient, { type ColorOption, type Product } from './CatalogoClient';

// Revalida el catálogo cada 60s para que las ediciones del admin (futuro)
// se reflejen sin necesidad de un nuevo deploy.
export const revalidate = 60;

export default async function Catalogo() {
  const [{ data: categoriesData, error: categoriesError }, { data: colorsData, error: colorsError }, { data: productsData, error: productsError }] =
    await Promise.all([
      supabase.from('product_categories').select('id, name').order('display_order', { ascending: true }),
      supabase.from('product_colors').select('name, hex_code').order('display_order', { ascending: true }),
      supabase
        .from('products')
        .select('id, category_id, name, description, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]);

  if (categoriesError) console.error('Error al cargar categorías del catálogo:', categoriesError);
  if (colorsError) console.error('Error al cargar colores del catálogo:', colorsError);
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
    personalizable: p.is_personalizable,
    businessInfo: p.has_business_info,
    characterOption: p.has_character_option,
  }));

  const categoryNames = ['Todos', ...categories.map((c) => c.name)];

  const colors: ColorOption[] = (colorsData ?? []).map((c) => ({
    name: c.name,
    hex: c.hex_code,
  }));

  return <CatalogoClient products={products} categoryNames={categoryNames} colors={colors} />;
}
