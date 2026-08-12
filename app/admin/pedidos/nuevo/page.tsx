import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import OrderForm from '../OrderForm';
import { createOrder } from '../actions';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function NuevoPedidoPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const { data: productsData } = await supabaseAdmin
    .from('products')
    .select('id, name, price, cost, image_url, is_active')
    .order('display_order', { ascending: true });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a pedidos
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Agregar pedido</h1>

        <OrderForm
          action={createOrder}
          products={productsData ?? []}
          error={error}
          submitLabel="Crear pedido"
          initialValues={{
            order_date: '',
            client_name: '',
            payment_status: '',
            payment_method: '',
            order_status: 'Pendiente Cotizar',
            items: [{ product_id: '', product_name: '', quantity: '1', sale_price: '', cost: '', makerworld_link: '' }],
          }}
        />
      </main>
    </div>
  );
}
