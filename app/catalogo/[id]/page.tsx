import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { HOME_CATEGORIES } from '@/lib/homeCategories';
import CatalogHeader from '../CatalogHeader';
import CatalogFooter from '../CatalogFooter';
import ProductDetailClient from './ProductDetailClient';
import ProductCarousel from '@/components/ProductCarousel';
import type { Product } from '../types';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ desde?: string; tipo?: string; min?: string; max?: string }>;
}

export default async function ProductoDetalle({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { desde, tipo, min, max } = await searchParams;

  // Si llegó desde una página de categoría, "volver" regresa ahí y no al catálogo.
  const fromCategory = HOME_CATEGORIES.find((c) => c.slug === desde);
  const fromHome = desde === 'inicio';
  const searchQuery = fromCategory
    ? [tipo && `tipo=${encodeURIComponent(tipo)}`, min && `min=${encodeURIComponent(min)}`, max && `max=${encodeURIComponent(max)}`]
        .filter(Boolean)
        .join('&')
    : '';
  const backHref = fromHome ? '/' : fromCategory ? `/categorias/${fromCategory.slug}${searchQuery ? `?${searchQuery}` : ''}` : '/catalogo';
  const fromQuery = fromHome ? 'desde=inicio' : fromCategory ? `desde=${fromCategory.slug}${searchQuery ? `&${searchQuery}` : ''}` : undefined;
  const backLabel = fromHome ? 'Volver al inicio' : fromCategory ? `Volver a ${fromCategory.dbName}` : 'Volver al catálogo';

  const [{ data: product }, { data: extraImages }] = await Promise.all([
    supabase
      .from('products')
      .select('id, category_id, name, description, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('product_images').select('image_url').eq('product_id', id).order('display_order', { ascending: true }),
  ]);

  if (!product) notFound();

  const [{ data: categoryRow }, { data: similarData }] = await Promise.all([
    supabase.from('product_categories').select('name').eq('id', product.category_id).maybeSingle(),
    supabase
      .from('products')
      .select('id, category_id, name, description, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option')
      .eq('category_id', product.category_id)
      .eq('is_active', true)
      .neq('id', product.id)
      .order('display_order', { ascending: true })
      .limit(12),
  ]);

  const productForDetail: Product = {
    id: product.id,
    name: product.name,
    category: categoryRow?.name ?? '',
    description: product.description,
    price: product.price,
    isStartingPrice: product.is_starting_price,
    image: product.image_url,
    images: [product.image_url, ...(extraImages ?? []).map((img) => img.image_url)],
    personalizable: product.is_personalizable,
    businessInfo: product.has_business_info,
    characterOption: product.has_character_option,
  };

  const similarProducts: Product[] = (similarData ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: categoryRow?.name ?? '',
    description: p.description,
    price: p.price,
    isStartingPrice: p.is_starting_price,
    image: p.image_url,
    images: [p.image_url],
    personalizable: p.is_personalizable,
    businessInfo: p.has_business_info,
    characterOption: p.has_character_option,
  }));

  return (
    <div className="flex flex-col min-h-screen min-w-0 bg-zinc-50 text-zinc-900 selection:bg-primary selection:text-white">
      <CatalogHeader />
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 min-w-0">
        <ProductDetailClient product={productForDetail} backHref={backHref} backLabel={backLabel} />
        {similarProducts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-zinc-200">
            <ProductCarousel title="Productos similares" products={similarProducts} fromQuery={fromQuery} autoScroll />
          </section>
        )}
      </main>
      <CatalogFooter />
    </div>
  );
}
