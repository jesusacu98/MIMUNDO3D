import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import CatalogHeader from '../CatalogHeader';
import CatalogFooter from '../CatalogFooter';
import ProductDetailClient from './ProductDetailClient';
import type { Product } from '../types';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductoDetalle({ params }: PageProps) {
  const { id } = await params;

  const [{ data: product }, { data: extraImages }, { data: colorsData }] = await Promise.all([
    supabase
      .from('products')
      .select('id, category_id, name, description, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.from('product_images').select('image_url').eq('product_id', id).order('display_order', { ascending: true }),
    supabase.from('product_colors').select('name, hex_code').order('display_order', { ascending: true }),
  ]);

  if (!product) notFound();

  const { data: categoryRow } = await supabase.from('product_categories').select('name').eq('id', product.category_id).maybeSingle();

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

  const colors = (colorsData ?? []).map((c) => ({ name: c.name, hex: c.hex_code }));

  return (
    <div className="flex flex-col min-h-screen min-w-0 bg-zinc-50 text-zinc-900 selection:bg-primary selection:text-white">
      <CatalogHeader />
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 min-w-0">
        <ProductDetailClient product={productForDetail} colors={colors} />
      </main>
      <CatalogFooter />
    </div>
  );
}
