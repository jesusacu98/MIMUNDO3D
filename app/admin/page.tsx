import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Package, Tags } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabaseClient';
import AdminHeader from './AdminHeader';

export default async function AdminPage() {
  // El middleware ya protege /admin, pero se verifica también aquí
  // (defensa en profundidad) por si el matcher del middleware cambiara.
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ count: productCount }, { count: categoryCount }] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('product_categories').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AdminHeader email={user.email ?? ''} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Panel de Administración</h1>
        <p className="text-zinc-600 mb-10 break-all">Bienvenido, {user.email}.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
          <Link
            href="/admin/productos"
            className="block bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-3xl font-extrabold text-zinc-950">{productCount ?? 0}</p>
            <p className="text-sm text-zinc-500">productos en el catálogo — gestionar →</p>
          </Link>

          <Link
            href="/admin/categorias"
            className="block bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Tags className="w-6 h-6" />
            </div>
            <p className="text-3xl font-extrabold text-zinc-950">{categoryCount ?? 0}</p>
            <p className="text-sm text-zinc-500">categorías — gestionar →</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
