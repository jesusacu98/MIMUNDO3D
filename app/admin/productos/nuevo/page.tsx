import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ProductForm from '../ProductForm';
import { createProduct } from '../actions';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NuevoProductoPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ data: categoriesData }, { data: maxOrderRow }] = await Promise.all([
    supabase.from('product_categories').select('id, name').order('display_order', { ascending: true }),
    supabaseAdmin.from('products').select('display_order').order('display_order', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const nextDisplayOrder = (maxOrderRow?.display_order ?? 0) + 1;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/productos" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a productos
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Agregar producto</h1>

        <ProductForm
          categories={categoriesData ?? []}
          action={createProduct}
          error={error}
          submitLabel="Crear producto"
          initialValues={{
            name: '',
            category_id: '',
            description: '',
            price: 0,
            is_starting_price: true,
            image_url: '',
            is_personalizable: false,
            has_business_info: false,
            has_character_option: false,
            is_active: true,
            display_order: nextDisplayOrder,
          }}
        />
      </main>
    </div>
  );
}
