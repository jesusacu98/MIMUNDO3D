import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getSiteCategories } from '@/lib/siteCategories';
import { getBanners } from '@/lib/banners';
import BannerSlider from '@/components/BannerSlider';
import SiteHeader from '@/components/SiteHeader';
import IdeasFab from '@/components/IdeasFab';
import IdeasCta from '@/components/IdeasCta';
import CategoryHero from '@/components/CategoryHero';
import CatalogFooter from '../../catalogo/CatalogFooter';
import CategoryProducts, { type CategoryProduct } from './CategoryProducts';

interface PageProps {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<{ tipo?: string; min?: string; max?: string }>;
}

export default async function CategoriaPage({ params, searchParams }: PageProps) {
  const { categoria } = await params;
  const { tipo, min, max } = await searchParams;

  const homeCategory = (await getSiteCategories()).find((c) => c.slug === categoria);
  if (!homeCategory) notFound();

  const { data: categoryRow } = await supabase
    .from('product_categories')
    .select('id')
    .eq('name', homeCategory.dbName)
    .maybeSingle();

  const banners = categoryRow ? (await getBanners('category_page')).filter((b) => b.categoryIds.includes(categoryRow.id)) : [];

  const { data: subcategoriesData } = categoryRow
    ? await supabase
        .from('product_subcategories')
        .select('id, name')
        .eq('category_id', categoryRow.id)
        .order('display_order', { ascending: true })
    : { data: [] };
  const subcategories = subcategoriesData ?? [];
  const subcategoryNameById = new Map(subcategories.map((s) => [s.id, s.name]));

  const { data: productsData } = categoryRow
    ? await supabase
        .from('products')
        .select(
          'id, category_id, name, description, subcategory_id, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option'
        )
        .eq('category_id', categoryRow.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
    : { data: [] };

  const products: CategoryProduct[] = (productsData ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: homeCategory.dbName,
    description: p.description,
    subcategory: p.subcategory_id ? (subcategoryNameById.get(p.subcategory_id) ?? null) : null,
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
      <SiteHeader />
      <IdeasFab />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 min-w-0">
        {banners.length > 0 && (
          <div className="mb-10">
            <BannerSlider banners={banners} />
          </div>
        )}
        <CategoryHero
          slug={homeCategory.slug}
          name={homeCategory.dbName}
          headline={homeCategory.headline}
          description={homeCategory.description}
          productCount={products.length}
        />

        <CategoryProducts
          products={products}
          subcategoryOrder={subcategories.map((s) => s.name)}
          categorySlug={homeCategory.slug}
          initialTipo={tipo ?? ''}
          initialMin={min ?? ''}
          initialMax={max ?? ''}
        />

        <IdeasCta />

        <div className="mt-8 text-center">
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
