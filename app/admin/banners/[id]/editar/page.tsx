import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSiteCategories } from '@/lib/siteCategories';
import { placementKey } from '@/lib/banners';
import BannerForm from '../../BannerForm';
import { updateBanner } from '../../actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditarBannerPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const { data: banner } = await supabaseAdmin.from('banners').select('*').eq('id', id).maybeSingle();
  if (!banner) notFound();

  const { data: placementRows } = await supabaseAdmin.from('banner_placements').select('placement, category_id').eq('banner_id', id);

  const { data: categoriesData } = await supabaseAdmin.from('product_categories').select('id, name');
  // Sólo las categorías con página propia (/categorias/[slug]) e imagen en el inicio.
  const pageCategoryNames = new Set((await getSiteCategories()).map((c) => c.dbName));
  const categories = (categoriesData ?? []).filter((c) => pageCategoryNames.has(c.name));

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/banners" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a banners
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Editar banner</h1>

        <BannerForm
          categories={categories}
          action={updateBanner.bind(null, id)}
          error={error}
          submitLabel="Guardar cambios"
          initialValues={{
            title: banner.title,
            placements: (placementRows ?? []).map((p) => placementKey(p.placement, p.category_id)),
            link_url: banner.link_url ?? '',
            display_order: banner.display_order,
            is_active: banner.is_active,
            image_url: banner.image_url,
            mobile_image_url: banner.mobile_image_url,
          }}
        />
      </main>
    </div>
  );
}
