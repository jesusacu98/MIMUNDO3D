import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import SubcategoryForm from '../../SubcategoryForm';
import { updateSubcategory } from '../../actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditarSubcategoriaPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ data: categoriesData }, { data: subcategory }] = await Promise.all([
    supabaseAdmin.from('product_categories').select('id, name').order('display_order', { ascending: true }),
    supabaseAdmin.from('product_subcategories').select('id, category_id, name, display_order').eq('id', id).maybeSingle(),
  ]);

  if (!subcategory) notFound();

  const updateSubcategoryWithId = updateSubcategory.bind(null, id);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/subcategorias" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a subcategorías
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Editar subcategoría</h1>

        <SubcategoryForm
          categories={categoriesData ?? []}
          action={updateSubcategoryWithId}
          error={error}
          submitLabel="Guardar cambios"
          initialValues={{ category_id: subcategory.category_id, name: subcategory.name, display_order: subcategory.display_order }}
        />
      </main>
    </div>
  );
}
