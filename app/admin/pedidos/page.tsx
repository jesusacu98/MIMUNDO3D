import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import AdminHeader from '../AdminHeader';
import DeleteOrderButton from './DeleteOrderButton';
import { deleteOrder } from './actions';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const orderStatusClass: Record<string, string> = {
  Entregado: 'bg-emerald-50 text-emerald-700',
  Imprimiendo: 'bg-blue-50 text-blue-700',
  'Pendiente Imprimir': 'bg-amber-50 text-amber-700',
  'Pendiente Cotizar': 'bg-zinc-100 text-zinc-500',
  Cancelado: 'bg-red-50 text-red-600',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function AdminPedidosPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ data: ordersData }, { data: itemsData }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, order_date, client_name, payment_status, payment_method, order_status')
      .order('order_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('order_items').select('order_id, product_name, sale_price, cost'),
  ]);

  const itemsByOrder = new Map<string, { product_name: string; sale_price: number | null; cost: number | null }[]>();
  for (const item of itemsData ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const orders = (ordersData ?? []).map((order) => {
    const items = itemsByOrder.get(order.id) ?? [];
    const salePrice = items.reduce((sum, i) => sum + (i.sale_price ?? 0), 0);
    const cost = items.reduce((sum, i) => sum + (i.cost ?? 0), 0);
    const profit = salePrice - cost;
    const productSummary =
      items.length === 0 ? 'Sin productos' : items.length === 1 ? items[0].product_name : `${items[0].product_name} +${items.length - 1} más`;
    return { ...order, salePrice, cost, profit, productSummary };
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AdminHeader email={user.email ?? ''} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Pedidos</h1>
            <p className="text-zinc-600">{orders.length} pedido(s) en total.</p>
          </div>
          <Link
            href="/admin/pedidos/nuevo"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Agregar pedido
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</p>}

        {/* Mobile: tarjetas apiladas */}
        <div className="sm:hidden bg-white border border-zinc-200/60 rounded-2xl overflow-hidden divide-y divide-zinc-100">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/pedidos/${order.id}/editar`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-zinc-50"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 truncate">
                  {order.client_name} · {order.productSummary}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {formatDate(order.order_date)} · {currency.format(order.salePrice)} · Ganancia {currency.format(order.profit)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                    orderStatusClass[order.order_status] ?? 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {order.order_status}
                </span>
                <Pencil className="w-4 h-4 text-primary" />
              </div>
            </Link>
          ))}
          {orders.length === 0 && <p className="px-4 py-10 text-center text-zinc-500 text-sm">Todavía no hay pedidos.</p>}
        </div>

        {/* Desktop/tablet: tabla completa */}
        <div className="hidden sm:block bg-white border border-zinc-200/60 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[880px]">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                <th className="text-left px-5 py-3 font-semibold">Cliente</th>
                <th className="text-left px-5 py-3 font-semibold">Productos</th>
                <th className="text-left px-5 py-3 font-semibold">Venta</th>
                <th className="text-left px-5 py-3 font-semibold">Costo</th>
                <th className="text-left px-5 py-3 font-semibold">Ganancia</th>
                <th className="text-left px-5 py-3 font-semibold">Pago</th>
                <th className="text-left px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3" />
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3 text-zinc-600 whitespace-nowrap">{formatDate(order.order_date)}</td>
                  <td className="px-5 py-3 font-medium text-zinc-900">{order.client_name}</td>
                  <td className="px-5 py-3 text-zinc-600">{order.productSummary}</td>
                  <td className="px-5 py-3 text-zinc-600 whitespace-nowrap">{currency.format(order.salePrice)}</td>
                  <td className="px-5 py-3 text-zinc-600 whitespace-nowrap">{currency.format(order.cost)}</td>
                  <td className={`px-5 py-3 font-semibold whitespace-nowrap ${order.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {currency.format(order.profit)}
                  </td>
                  <td className="px-5 py-3 text-zinc-600 whitespace-nowrap">{order.payment_status ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                        orderStatusClass[order.order_status] ?? 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {order.order_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/pedidos/${order.id}/editar`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DeleteOrderButton label={`${order.client_name} - ${order.productSummary}`} action={deleteOrder.bind(null, order.id)} />
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-zinc-500">
                    Todavía no hay pedidos.
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
