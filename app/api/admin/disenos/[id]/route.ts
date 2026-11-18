import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteDesignImagesIfManaged } from '@/lib/storage';

// Borra una generación del historial junto con sus imágenes.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const { id } = await params;

  const { data } = await supabaseAdmin.from('design_history').select('image_urls, fusion_urls').eq('id', id).single();
  const { error } = await supabaseAdmin.from('design_history').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'No se pudo borrar.' }, { status: 500 });
  if (data) {
    const fusion = data.fusion_urls && typeof data.fusion_urls === 'object' ? Object.values(data.fusion_urls as Record<string, string>) : [];
    await deleteDesignImagesIfManaged([...(data.image_urls ?? []), ...fusion]);
  }
  return NextResponse.json({ ok: true });
}

// Vincula una variante de la generación (`variant`, índice del boceto) a un pedido (`orderId`), o
// le quita el vínculo (`orderId: null`). Cada generación tiene a lo sumo una variante vinculada.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const orderId = typeof body?.orderId === 'string' && body.orderId ? body.orderId : null;
  const variantRaw = Number(body?.variant);
  const variant = orderId && Number.isInteger(variantRaw) && variantRaw >= 0 ? variantRaw : null;
  if (orderId && variant === null) return NextResponse.json({ error: 'Falta indicar qué variante vincular.' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('design_history')
    .update({ order_id: orderId, order_variant: variant })
    .eq('id', id)
    .select('id');
  if (error) {
    console.error('[disenos] No se pudo vincular al pedido:', error);
    // 42703 / PGRST204: las columnas order_id / order_variant no existen todavía.
    const missing = error.code === '42703' || error.code === 'PGRST204';
    return NextResponse.json(
      { error: missing ? 'Falta correr (o volver a correr) supabase/schema_disenos_order.sql en el SQL Editor de Supabase.' : 'No se pudo vincular el diseño al pedido.' },
      { status: 500 },
    );
  }
  if (!data || data.length === 0) return NextResponse.json({ error: 'Ese diseño ya no existe en el historial.' }, { status: 404 });
  return NextResponse.json({ ok: true, orderId, variant });
}
