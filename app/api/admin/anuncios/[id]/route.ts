import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteAdImagesIfManaged } from '@/lib/storage';
import { sanitizeHashtags } from '@/lib/anuncios/copy';
import { toAdRecord } from '@/lib/anuncios/history';

// Edita el texto de un anuncio del historial (descripción, hashtags, versión de WhatsApp).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as { caption?: unknown; hashtags?: unknown; whatsappText?: unknown } | null;
  if (!body) return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 });

  const update: { caption?: string; hashtags?: string[]; whatsapp_text?: string } = {};
  if (typeof body.caption === 'string') update.caption = body.caption.slice(0, 4000);
  if (typeof body.whatsappText === 'string') update.whatsapp_text = body.whatsappText.slice(0, 2000);
  if (Array.isArray(body.hashtags)) update.hashtags = sanitizeHashtags(body.hashtags);
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nada que guardar.' }, { status: 400 });

  const { data, error } = await supabaseAdmin.from('ad_creatives').update(update).eq('id', id).select('*').single();
  if (error || !data) return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 });
  return NextResponse.json({ ad: toAdRecord(data) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const { id } = await params;

  const { data } = await supabaseAdmin.from('ad_creatives').select('image_urls').eq('id', id).single();
  const { error } = await supabaseAdmin.from('ad_creatives').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'No se pudo borrar.' }, { status: 500 });
  if (data) await deleteAdImagesIfManaged(data.image_urls ?? []);
  return NextResponse.json({ ok: true });
}
