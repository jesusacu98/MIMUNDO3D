import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ProductsList from './ProductsList';

export default async function AdminProductosPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ data: categoriesData }, { data: subcategoriesData }, { data: productsData }] = await Promise.all([
    supabaseAdmin.from('product_categories').select('id, name').order('display_order', { ascending: true }),
    supabaseAdmin.from('product_subcategories').select('id, name, category_id').order('display_order', { ascending: true }),
    supabaseAdmin
      .from('products')
      .select('id, category_id, subcategory_id, name, price, cost, is_starting_price, image_url, is_active, display_order')
      .order('display_order', { ascending: true }),
  ]);

  const products = productsData ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Productos</h1>
            <p className="text-zinc-600">{products.length} producto(s) en total.</p>
          </div>
          <Link
            href="/admin/productos/nuevo"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Agregar producto
          </Link>
        </div>

        <ProductsList products={products} categories={categoriesData ?? []} subcategories={subcategoriesData ?? []} />
      </main>
    </div>
  );
}
