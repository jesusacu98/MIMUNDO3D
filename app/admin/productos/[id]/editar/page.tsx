import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ProductForm from '../../ProductForm';
import { updateProduct } from '../../actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditarProductoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ data: categoriesData }, { data: product }] = await Promise.all([
    supabase.from('product_categories').select('id, name').order('display_order', { ascending: true }),
    supabaseAdmin.from('products').select('*').eq('id', id).maybeSingle(),
  ]);

  if (!product) notFound();

  const updateProductWithId = updateProduct.bind(null, id);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/productos" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a productos
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Editar producto</h1>

        <ProductForm
          categories={categoriesData ?? []}
          action={updateProductWithId}
          error={error}
          submitLabel="Guardar cambios"
          initialValues={{
            name: product.name,
            category_id: product.category_id,
            description: product.description,
            price: product.price,
            is_starting_price: product.is_starting_price,
            image_url: product.image_url,
            is_personalizable: product.is_personalizable,
            has_business_info: product.has_business_info,
            has_character_option: product.has_character_option,
            is_active: product.is_active,
            display_order: product.display_order,
          }}
        />
      </main>
    </div>
  );
}
