'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database } from '@/lib/database.types';

type OrderInsert = Database['public']['Tables']['orders']['Insert'];
type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];
type ParsedItem = Omit<OrderItemInsert, 'order_id'>;

const ORDER_STATUSES = ['Pendiente Cotizar', 'Imprimiendo', 'Entregado', 'Cancelado'];
const PAYMENT_STATUSES = ['Pagado', 'Pendiente'];

function parseOrderForm(formData: FormData): { values: OrderInsert } | { error: string } {
  const clientName = String(formData.get('client_name') || '').trim();
  const orderDateRaw = String(formData.get('order_date') || '').trim();
  const paymentStatusRaw = String(formData.get('payment_status') || '').trim();
  const paymentMethod = String(formData.get('payment_method') || '').trim();
  const orderStatus = String(formData.get('order_status') || '').trim();

  if (!clientName) {
    return { error: 'Escribe el nombre del cliente.' };
  }
  if (!ORDER_STATUSES.includes(orderStatus)) {
    return { error: 'Estatus de pedido inválido.' };
  }
  if (paymentStatusRaw && !PAYMENT_STATUSES.includes(paymentStatusRaw)) {
    return { error: 'Estatus de pago inválido.' };
  }

  return {
    values: {
      order_date: orderDateRaw || null,
      client_name: clientName,
      payment_status: paymentStatusRaw || null,
      payment_method: paymentMethod || null,
      order_status: orderStatus,
    },
  };
}

function parseItems(formData: FormData): { items: ParsedItem[] } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get('items_json') || '[]'));
  } catch {
    return { error: 'Los productos del pedido llegaron en un formato inválido.' };
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'Agrega al menos un producto al pedido.' };
  }

  const items: ParsedItem[] = [];
  for (const entry of raw) {
    const record = entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : {};

    const productName = String(record.product_name || '').trim();
    if (!productName) {
      return { error: 'Cada producto necesita una descripción.' };
    }

    const quantity = Number(record.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) {
      return { error: 'La cantidad debe ser un número entero mayor o igual a 1.' };
    }

    const salePriceRaw = String(record.sale_price ?? '').trim();
    const salePrice = salePriceRaw ? Number(salePriceRaw) : null;
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) {
      return { error: 'El precio de venta debe ser un número válido mayor o igual a 0.' };
    }

    const costRaw = String(record.cost ?? '').trim();
    const cost = costRaw ? Number(costRaw) : null;
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      return { error: 'El costo debe ser un número válido mayor o igual a 0.' };
    }

    const productId = String(record.product_id || '').trim();
    const makerworldLink = String(record.makerworld_link || '').trim();

    items.push({
      product_id: productId || null,
      product_name: productName,
      quantity,
      sale_price: salePrice,
      cost,
      makerworld_link: makerworldLink || null,
    });
  }

  return { items };
}

export async function createOrder(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsedOrder = parseOrderForm(formData);
  if ('error' in parsedOrder) {
    redirect(`/admin/pedidos/nuevo?error=${encodeURIComponent(parsedOrder.error)}`);
  }

  const parsedItems = parseItems(formData);
  if ('error' in parsedItems) {
    redirect(`/admin/pedidos/nuevo?error=${encodeURIComponent(parsedItems.error)}`);
  }

  const { data: order, error: orderError } = await supabaseAdmin.from('orders').insert(parsedOrder.values).select('id').single();

  if (orderError || !order) {
    redirect(`/admin/pedidos/nuevo?error=${encodeURIComponent('No se pudo crear el pedido: ' + (orderError?.message ?? ''))}`);
    return;
  }

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(parsedItems.items.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    await supabaseAdmin.from('orders').delete().eq('id', order.id);
    redirect(`/admin/pedidos/nuevo?error=${encodeURIComponent('No se pudo guardar los productos del pedido: ' + itemsError.message)}`);
  }

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  redirect('/admin/pedidos');
}

export async function updateOrder(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsedOrder = parseOrderForm(formData);
  if ('error' in parsedOrder) {
    redirect(`/admin/pedidos/${id}/editar?error=${encodeURIComponent(parsedOrder.error)}`);
  }

  const parsedItems = parseItems(formData);
  if ('error' in parsedItems) {
    redirect(`/admin/pedidos/${id}/editar?error=${encodeURIComponent(parsedItems.error)}`);
  }

  const { error: orderError } = await supabaseAdmin.from('orders').update(parsedOrder.values).eq('id', id);

  if (orderError) {
    redirect(`/admin/pedidos/${id}/editar?error=${encodeURIComponent('No se pudo guardar el pedido: ' + orderError.message)}`);
  }

  const { error: deleteError } = await supabaseAdmin.from('order_items').delete().eq('order_id', id);

  if (deleteError) {
    redirect(`/admin/pedidos/${id}/editar?error=${encodeURIComponent('No se pudieron actualizar los productos: ' + deleteError.message)}`);
  }

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(parsedItems.items.map((item) => ({ ...item, order_id: id })));

  if (itemsError) {
    redirect(`/admin/pedidos/${id}/editar?error=${encodeURIComponent('No se pudieron guardar los productos: ' + itemsError.message)}`);
  }

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  redirect('/admin/pedidos');
}

export async function deleteOrder(id: string, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const { error } = await supabaseAdmin.from('orders').delete().eq('id', id);

  if (error) {
    redirect(`/admin/pedidos?error=${encodeURIComponent('No se pudo borrar el pedido: ' + error.message)}`);
  }

  revalidatePath('/admin/pedidos');
  revalidatePath('/admin');
  redirect('/admin/pedidos');
}
