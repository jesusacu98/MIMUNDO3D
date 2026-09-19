import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import DeleteSubcategoryButton from './DeleteSubcategoryButton';
import { deleteSubcategory } from './actions';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminSubcategoriasPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ data: categoriesData }, { data: subcategoriesData }, { data: productRows }] = await Promise.all([
    supabaseAdmin.from('product_categories').select('id, name, display_order').order('display_order', { ascending: true }),
    supabaseAdmin.from('product_subcategories').select('id, category_id, name, display_order').order('display_order', { ascending: true }),
    supabaseAdmin.from('products').select('subcategory_id').not('subcategory_id', 'is', null),
  ]);

  const categories = categoriesData ?? [];
  const subcategories = subcategoriesData ?? [];

  const productCount = new Map<string, number>();
  for (const row of productRows ?? []) {
    if (row.subcategory_id) productCount.set(row.subcategory_id, (productCount.get(row.subcategory_id) ?? 0) + 1);
  }

  const rows = categories.flatMap((category) =>
    subcategories.filter((s) => s.category_id === category.id).map((s) => ({ ...s, categoryName: category.name }))
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Subcategorías</h1>
            <p className="text-zinc-600">
              {rows.length} subcategoría(s). Se usan como filtro dentro de cada categoría; asígnalas desde{' '}
              <Link href="/admin/productos" className="text-primary font-semibold hover:text-primary-dark">
                Productos
              </Link>
              .
            </p>
          </div>
          <Link
            href="/admin/subcategorias/nueva"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Agregar subcategoría
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</p>}

        <div className="bg-white border border-zinc-200/60 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Nombre</th>
                <th className="text-left px-5 py-3 font-semibold">Categoría</th>
                <th className="text-left px-5 py-3 font-semibold">Productos</th>
                <th className="text-left px-5 py-3 font-semibold">Orden</th>
                <th className="px-5 py-3" />
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((sub) => (
                <tr key={sub.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3 font-medium text-zinc-900">{sub.name}</td>
                  <td className="px-5 py-3 text-zinc-600">{sub.categoryName}</td>
                  <td className="px-5 py-3 text-zinc-600">{productCount.get(sub.id) ?? 0}</td>
                  <td className="px-5 py-3 text-zinc-600">{sub.display_order}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/subcategorias/${sub.id}/editar`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DeleteSubcategoryButton subcategoryName={sub.name} action={deleteSubcategory.bind(null, sub.id)} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                    Todavía no hay subcategorías.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
