import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import AdminHeader from '../AdminHeader';

export default async function AdminProductosPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ data: categoriesData }, { data: productsData }] = await Promise.all([
    supabaseAdmin.from('product_categories').select('id, name').order('display_order', { ascending: true }),
    supabaseAdmin
      .from('products')
      .select('id, category_id, name, price, is_starting_price, image_url, is_active, display_order')
      .order('display_order', { ascending: true }),
  ]);

  const categoryNameById = new Map((categoriesData ?? []).map((c) => [c.id, c.name]));
  const products = productsData ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AdminHeader email={user.email ?? ''} />

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

        {/* Mobile: tarjetas apiladas, toda la fila es tocable */}
        <div className="sm:hidden bg-white border border-zinc-200/60 rounded-2xl overflow-hidden divide-y divide-zinc-100">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/admin/productos/${product.id}/editar`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-zinc-50"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 truncate">{product.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {categoryNameById.get(product.category_id) ?? '—'} · {product.is_starting_price ? 'Desde ' : ''}$
                  {product.price} MXN
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                    product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {product.is_active ? 'Activo' : 'Oculto'}
                </span>
                <Pencil className="w-4 h-4 text-primary" />
              </div>
            </Link>
          ))}
          {products.length === 0 && (
            <p className="px-4 py-10 text-center text-zinc-500 text-sm">Todavía no hay productos.</p>
          )}
        </div>

        {/* Desktop/tablet: tabla completa */}
        <div className="hidden sm:block bg-white border border-zinc-200/60 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Producto</th>
                <th className="text-left px-5 py-3 font-semibold">Categoría</th>
                <th className="text-left px-5 py-3 font-semibold">Precio</th>
                <th className="text-left px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3 font-medium text-zinc-900">{product.name}</td>
                  <td className="px-5 py-3 text-zinc-600">{categoryNameById.get(product.category_id) ?? '—'}</td>
                  <td className="px-5 py-3 text-zinc-600">
                    {product.is_starting_price ? 'Desde ' : ''}${product.price} MXN
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {product.is_active ? 'Activo' : 'Oculto'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/productos/${product.id}/editar`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-zinc-500">
                    Todavía no hay productos.
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
