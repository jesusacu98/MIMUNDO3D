import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { orderStatusClass } from '@/lib/orderStatuses';
import DeleteOrderButton from './DeleteOrderButton';

export interface OrderRow {
  id: string;
  order_date: string | null;
  client_name: string;
  payment_status: string | null;
  payment_method: string | null;
  advance_amount: number | null;
  order_status: string;
  salePrice: number;
  cost: number;
  profit: number;
  productSummary: string;
  deleteAction: (formData: FormData) => void | Promise<void>;
}

interface PedidosTableProps {
  orders: OrderRow[];
  emptyMessage: string;
}

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PedidosTable({ orders, emptyMessage }: PedidosTableProps) {
  return (
    <>
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
                {order.advance_amount != null && ` · Anticipo ${currency.format(order.advance_amount)}`}
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
        {orders.length === 0 && <p className="px-4 py-10 text-center text-zinc-500 text-sm">{emptyMessage}</p>}
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
              <th className="text-left px-5 py-3 font-semibold">Anticipo</th>
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
                <td className="px-5 py-3 text-zinc-600 whitespace-nowrap">
                  {order.advance_amount != null ? currency.format(order.advance_amount) : '—'}
                </td>
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
                  <DeleteOrderButton label={`${order.client_name} - ${order.productSummary}`} action={order.deleteAction} />
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={11} className="px-5 py-10 text-center text-zinc-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
