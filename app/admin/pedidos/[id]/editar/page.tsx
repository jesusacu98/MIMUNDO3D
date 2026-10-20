import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Receipt } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import OrderForm from '../../OrderForm';
import { updateOrder } from '../../actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditarPedidoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ data: order }, { data: orderItemsData }, { data: productsData }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, order_date, delivery_date, client_name, payment_status, payment_method, advance_amount, whatsapp_link, order_status')
      .eq('id', id)
      .maybeSingle(),
    supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true }),
    supabaseAdmin.from('products').select('id, name, price, cost, image_url, is_active').order('display_order', { ascending: true }),
  ]);

  if (!order) notFound();

  const items = (orderItemsData ?? []).map((item) => ({
    product_id: item.product_id ?? '',
    product_name: item.product_name,
    client_description: item.client_description ?? '',
    quantity: String(item.quantity),
    sale_price: item.sale_price != null ? String(item.sale_price) : '',
    cost: item.cost != null ? String(item.cost) : '',
    makerworld_link: item.makerworld_link ?? '',
  }));

  const updateOrderWithId = updateOrder.bind(null, id);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a pedidos
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950">Editar pedido</h1>
          <Link
            href={`/admin/pedidos/${id}/ticket`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary/5 text-sm font-semibold transition-colors"
          >
            <Receipt className="w-4 h-4" />
            Nota para el cliente
          </Link>
        </div>

        <OrderForm
          action={updateOrderWithId}
          products={productsData ?? []}
          error={error}
          submitLabel="Guardar cambios"
          initialValues={{
            order_date: order.order_date ?? '',
            delivery_date: order.delivery_date ?? '',
            client_name: order.client_name,
            payment_status: order.payment_status ?? '',
            payment_method: order.payment_method ?? '',
            advance_amount: order.advance_amount != null ? String(order.advance_amount) : '',
            whatsapp_link: order.whatsapp_link ?? '',
            order_status: order.order_status,
            items: items.length > 0 ? items : [{ product_id: '', product_name: '', quantity: '1', sale_price: '', cost: '', makerworld_link: '' }],
          }}
        />
      </main>
    </div>
  );
}
