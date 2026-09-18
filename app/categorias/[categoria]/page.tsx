import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { HOME_CATEGORIES } from '@/lib/homeCategories';
import CatalogHeader from '../../catalogo/CatalogHeader';
import CatalogFooter from '../../catalogo/CatalogFooter';
import ProductThumbnail from '../../catalogo/ProductThumbnail';
import { formatPrice, type Product } from '../../catalogo/types';

export const revalidate = 60;

export function generateStaticParams() {
  return HOME_CATEGORIES.map((c) => ({ categoria: c.slug }));
}

interface PageProps {
  params: Promise<{ categoria: string }>;
}

export default async function CategoriaPage({ params }: PageProps) {
  const { categoria } = await params;

  const homeCategory = HOME_CATEGORIES.find((c) => c.slug === categoria);
  if (!homeCategory) notFound();

  const { data: categoryRow } = await supabase
    .from('product_categories')
    .select('id')
    .eq('name', homeCategory.dbName)
    .maybeSingle();

  const { data: productsData } = categoryRow
    ? await supabase
        .from('products')
        .select(
          'id, category_id, name, description, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option'
        )
        .eq('category_id', categoryRow.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
    : { data: [] };

  const products: Product[] = (productsData ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: homeCategory.dbName,
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
        <div className="text-left mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 mb-3">{homeCategory.dbName}</h1>
          <p className="text-zinc-600 max-w-xl">{homeCategory.description}</p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/catalogo/${product.id}`}
                className="bg-white border border-zinc-200/60 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col h-full cursor-pointer"
              >
                <div className="aspect-square w-full bg-zinc-50 relative overflow-hidden">
                  <ProductThumbnail src={product.image} alt={product.name} />
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-md font-bold text-zinc-950 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-4 flex-grow">{product.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                    <span className="text-sm font-extrabold text-zinc-950">{formatPrice(product)}</span>
                    <span className="text-xs font-bold text-primary group-hover:text-primary-dark flex items-center gap-1">
                      Ver Detalles
                      <span className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-dashed border-zinc-200 rounded-2xl">
            <p className="text-zinc-500 text-sm">Todavía no hay productos publicados en esta categoría. Vuelve pronto.</p>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/catalogo" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark">
            Ver todo el catálogo
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <CatalogFooter />
    </div>
  );
}
