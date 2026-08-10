import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import CategoryForm from '../CategoryForm';
import { createCategory } from '../actions';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NuevaCategoriaPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const { data: maxOrderRow } = await supabaseAdmin
    .from('product_categories')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextDisplayOrder = (maxOrderRow?.display_order ?? 0) + 1;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/categorias" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a categorías
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Agregar categoría</h1>

        <CategoryForm
          action={createCategory}
          error={error}
          submitLabel="Crear categoría"
          initialValues={{ name: '', display_order: nextDisplayOrder }}
        />
      </main>
    </div>
  );
}
