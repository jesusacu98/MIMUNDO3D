import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { computeTicketPayment, type TicketData } from './ticket';

/** Arma los datos de la nota de un pedido (sin costos). Devuelve null si el pedido no existe. */
export async function loadTicketData(orderId: string): Promise<TicketData | null> {
  // select('*'): `client_description` es una columna nueva (supabase/schema_orders_client_description.sql);
  // pedirla por nombre rompería la consulta entera si todavía no se corrió la migración.
  const [{ data: order }, { data: items }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, order_date, delivery_date, client_name, payment_status, advance_amount')
      .eq('id', orderId)
      .maybeSingle(),
    supabaseAdmin.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
  ]);
  if (!order) return null;

  const lines = (items ?? []).map((item) => ({
    name: item.client_description?.trim() || item.product_name,
    quantity: item.quantity,
    price: item.sale_price ?? 0,
  }));
  const payment = computeTicketPayment(lines, order.payment_status, order.advance_amount);

  return {
    folio: order.id.slice(0, 8).toUpperCase(),
    clientName: order.client_name,
    orderDate: order.order_date,
    deliveryDate: order.delivery_date,
    items: lines,
    ...payment,
  };
}
