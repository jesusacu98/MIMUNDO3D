import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { HOME_CATEGORIES } from '@/lib/homeCategories';
import BannerForm from '../BannerForm';
import { createBanner } from '../actions';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NuevoBannerPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');


  const { data: categoriesData } = await supabaseAdmin.from('product_categories').select('id, name');
  // Sólo las categorías con página propia (/categorias/[slug]) e imagen en el inicio.
  const pageCategoryNames = new Set(HOME_CATEGORIES.map((c) => c.dbName));
  const categories = (categoriesData ?? []).filter((c) => pageCategoryNames.has(c.name));

  const { data: maxOrderRow } = await supabaseAdmin
    .from('banners')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/banners" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a banners
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Agregar banner</h1>

        <BannerForm
          categories={categories}
          action={createBanner}
          error={error}
          submitLabel="Crear banner"
          initialValues={{
            title: '',
            placements: ['home'],
            link_url: '',
            display_order: (maxOrderRow?.display_order ?? 0) + 1,
            is_active: true,
          }}
        />
      </main>
    </div>
  );
}
