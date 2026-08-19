import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ORDER_STATUSES } from '@/lib/orderStatuses';
import AdminHeader from '../AdminHeader';
import PedidosBrowser from './PedidosBrowser';
import { deleteOrder } from './actions';

interface PageProps {
  searchParams: Promise<{ error?: string; page?: string; q?: string; status?: string; payment?: string }>;
}

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const PAGE_SIZE = 20;

function collectedForOrder(order: { payment_status: string | null; salePrice: number; advance_amount: number | null }) {
  if (order.payment_status === 'Pagado') return order.salePrice;
  if (order.payment_status === 'Anticipo') return order.advance_amount ?? 0;
  return 0;
}

export default async function AdminPedidosPage({ searchParams }: PageProps) {
  const { error, page: pageParam, q: qParam, status: statusParam, payment: paymentParam } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const currentPage = Math.max(1, Number(pageParam) || 1);
  const q = (qParam ?? '').trim();
  const status = statusParam ?? '';
  const payment = paymentParam ?? '';

  // Totales globales (KPIs de arriba): siempre sobre TODOS los pedidos,
  // independientemente de los filtros/página que se estén viendo abajo.
  const [{ data: allOrdersStats }, { data: allItemsStats }] = await Promise.all([
    supabaseAdmin.from('orders').select('id, payment_status, advance_amount, order_status'),
    supabaseAdmin.from('order_items').select('order_id, sale_price, cost'),
  ]);

  const allSaleByOrder = new Map<string, number>();
  for (const item of allItemsStats ?? []) {
    allSaleByOrder.set(item.order_id, (allSaleByOrder.get(item.order_id) ?? 0) + (item.sale_price ?? 0));
  }

  const statusCounts = ORDER_STATUSES.map((s) => ({
    status: s,
    count: (allOrdersStats ?? []).filter((o) => o.order_status === s).length,
  }));

  const totalSaleAll = Array.from(allSaleByOrder.values()).reduce((sum, v) => sum + v, 0);
  const totalCollected = (allOrdersStats ?? []).reduce(
    (sum, o) => sum + collectedForOrder({ ...o, salePrice: allSaleByOrder.get(o.id) ?? 0 }),
    0
  );
  const collectedPercent = totalSaleAll > 0 ? Math.min(100, Math.round((totalCollected / totalSaleAll) * 100)) : 0;

  // Filas de la tabla: filtradas y paginadas en el servidor.
  let pageQuery = supabaseAdmin
    .from('orders')
    .select('id, order_date, client_name, payment_status, payment_method, advance_amount, order_status', { count: 'exact' });
  if (status) pageQuery = pageQuery.eq('order_status', status);
  if (payment) pageQuery = pageQuery.eq('payment_status', payment);
  if (q) pageQuery = pageQuery.ilike('client_name', `%${q}%`);
  pageQuery = pageQuery
    .order('order_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

  const { data: pageOrdersData, count } = await pageQuery;

  const pageOrderIds = (pageOrdersData ?? []).map((o) => o.id);
  const { data: pageItemsData } = pageOrderIds.length
    ? await supabaseAdmin.from('order_items').select('order_id, product_name, sale_price, cost').in('order_id', pageOrderIds)
    : { data: [] };

  const itemsByOrder = new Map<string, { product_name: string; sale_price: number | null; cost: number | null }[]>();
  for (const item of pageItemsData ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const orders = (pageOrdersData ?? []).map((order) => {
    const items = itemsByOrder.get(order.id) ?? [];
    const salePrice = items.reduce((sum, i) => sum + (i.sale_price ?? 0), 0);
    const cost = items.reduce((sum, i) => sum + (i.cost ?? 0), 0);
    const profit = salePrice - cost;
    const productSummary =
      items.length === 0 ? 'Sin productos' : items.length === 1 ? items[0].product_name : `${items[0].product_name} +${items.length - 1} más`;
    return { ...order, salePrice, cost, profit, productSummary, deleteAction: deleteOrder.bind(null, order.id) };
  });

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilters = Boolean(q || status || payment);
  const emptyMessage = totalCount === 0 && !hasFilters ? 'Todavía no hay pedidos.' : 'Ningún pedido coincide con los filtros.';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AdminHeader email={user.email ?? ''} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Pedidos</h1>
            <p className="text-zinc-600">{(allOrdersStats ?? []).length} pedido(s) en total.</p>
          </div>
          <Link
            href="/admin/pedidos/nuevo"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Agregar pedido
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {statusCounts.map(({ status: s, count: c }) => (
            <div key={s} className="bg-white border border-zinc-200/60 rounded-2xl p-4">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1 truncate">{s}</p>
              <p className="text-2xl font-extrabold text-zinc-950">{c}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-zinc-200/60 rounded-2xl p-5 sm:p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Venta total</p>
              <p className="text-2xl font-extrabold text-zinc-950">{currency.format(totalSaleAll)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Cobrado hasta ahora</p>
              <p className="text-2xl font-extrabold text-emerald-700">{currency.format(totalCollected)}</p>
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${collectedPercent}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-zinc-500">{collectedPercent}% cobrado</p>
            <p className="text-xs text-zinc-500">Falta por cobrar: {currency.format(Math.max(0, totalSaleAll - totalCollected))}</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</p>}

        <PedidosBrowser
          orders={orders}
          emptyMessage={emptyMessage}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          totalAllCount={(allOrdersStats ?? []).length}
        />
      </main>
    </div>
  );
}
