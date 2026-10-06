import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getIdeaSettings } from '@/lib/ideas/settings';
import { notifyAiError } from '@/lib/notify/email';
import { deleteAdImagesIfManaged, uploadAdImage } from '@/lib/storage';
import { getFormat, getStyle, getType, type AdOptions, type AdProduct } from '@/lib/anuncios/config';
import { renderAd } from '@/lib/anuncios/render';
import { generateAdCopy } from '@/lib/anuncios/copy';
import { toAdRecord } from '@/lib/anuncios/history';

// Escribir el texto y renderizar láminas (Satori + sharp) y pedir el texto a la IA tarda: un carrusel de 8 productos son 10 imágenes.
export const maxDuration = 90;

// `proxy.ts` sólo protege `/admin/:path*`, no `/api/*` — la ruta re-verifica el rol acá
// (mismo criterio de defensa en profundidad que el resto de /api/admin).
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    type?: string;
    style?: string;
    format?: string;
    productIds?: unknown;
    options?: AdOptions;
  } | null;
  if (!body) return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 });

  const type = getType(String(body.type));
  const style = getStyle(String(body.style));
  const format = getFormat(String(body.format));
  if (!type || !style || !format) return NextResponse.json({ error: 'Elegí un tipo, un estilo y un formato válidos.' }, { status: 400 });

  const ids = Array.isArray(body.productIds) ? body.productIds.filter((id): id is string => typeof id === 'string') : [];
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length < type.minProducts || uniqueIds.length > type.maxProducts) {
    return NextResponse.json(
      { error: type.minProducts === type.maxProducts ? `Elegí ${type.minProducts} producto.` : `Elegí de ${type.minProducts} a ${type.maxProducts} productos.` },
      { status: 400 },
    );
  }

  const rawOptions = body.options ?? {};
  const options: AdOptions = {
    title: typeof rawOptions.title === 'string' ? rawOptions.title.trim().slice(0, 80) : undefined,
    discountPercent: Number.isFinite(Number(rawOptions.discountPercent)) ? Math.min(90, Math.max(1, Math.round(Number(rawOptions.discountPercent)))) : undefined,
    deadline: typeof rawOptions.deadline === 'string' ? rawOptions.deadline.trim().slice(0, 40) : undefined,
    note: typeof rawOptions.note === 'string' ? rawOptions.note.trim().slice(0, 300) : undefined,
    showImageText: rawOptions.showImageText !== false,
    imageText: typeof rawOptions.imageText === 'string' ? rawOptions.imageText.trim().slice(0, 2000) : undefined,
  };

  const [{ data: productRows, error: productsError }, { data: categoryRows }] = await Promise.all([
    supabaseAdmin.from('products').select('id, name, description, price, is_starting_price, image_url, category_id').in('id', uniqueIds),
    supabaseAdmin.from('product_categories').select('id, name'),
  ]);
  if (productsError) return NextResponse.json({ error: 'No se pudieron leer los productos.' }, { status: 500 });

  const categoryName = new Map((categoryRows ?? []).map((c) => [c.id, c.name]));
  const byId = new Map((productRows ?? []).map((p) => [p.id, p]));
  const products: AdProduct[] = [];
  for (const id of uniqueIds) {
    const row = byId.get(id);
    if (!row) return NextResponse.json({ error: 'Alguno de los productos ya no existe.' }, { status: 400 });
    if (!row.image_url || !/^https?:\/\//.test(row.image_url)) {
      return NextResponse.json({ error: `«${row.name}» no tiene una foto con URL pública.` }, { status: 400 });
    }
    products.push({
      id: row.id,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      isStartingPrice: row.is_starting_price,
      imageUrl: row.image_url,
      category: categoryName.get(row.category_id) ?? '',
    });
  }

  const settings = await getIdeaSettings();

  let copy;
  try {
    copy = await generateAdCopy({ apiKey: settings.provider === 'mock' ? null : settings.apiKey, model: settings.model, style, type: type.id, products, options });
  } catch (error) {
    // Falló la IA (no la plantilla): el anuncio igual se entrega, con el texto de plantilla.
    console.error('[anuncios] Error del proveedor de IA:', error);
    void notifyAiError('anuncios', error);
    copy = await generateAdCopy({ apiKey: null, model: settings.model, style, type: type.id, products, options });
  }

  // El texto se escribe antes que las imágenes porque la primera lámina lleva una frase descriptiva.
  const imageText = options.showImageText === false ? '' : options.imageText || copy.imageText;

  let pngs: Buffer[];
  try {
    pngs = await renderAd({ style, format, type: type.id, products, options, imageText });
  } catch (error) {
    console.error('[anuncios] Error al armar las imágenes:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `No se pudieron armar las imágenes: ${message}` }, { status: 500 });
  }

  const baseName = `${type.id}-${style.id}-${products[0].name}`;
  const uploaded: string[] = [];
  for (let i = 0; i < pngs.length; i++) {
    const result = await uploadAdImage(pngs[i], `${baseName}-${i + 1}`);
    if ('error' in result) {
      await deleteAdImagesIfManaged(uploaded);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    uploaded.push(result.url);
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('ad_creatives')
    .insert({
      ad_type: type.id,
      style: style.id,
      format: format.id,
      product_ids: products.map((p) => p.id),
      product_names: products.map((p) => p.name),
      // Se guarda también la frase que quedó impresa en la imagen, para reabrir el anuncio con ella ya escrita.
      options: { ...options, imageText },
      image_urls: uploaded,
      caption: copy.variants[0].text,
      variants: copy.variants,
      hashtags: copy.hashtags,
      whatsapp_text: copy.whatsappText,
    })
    .select('*')
    .single();

  if (insertError || !inserted) {
    await deleteAdImagesIfManaged(uploaded);
    const hint = insertError?.message?.includes('ad_creatives') ? ' ¿Corriste supabase/schema_anuncios.sql en Supabase?' : '';
    return NextResponse.json({ error: `No se pudo guardar el anuncio en el historial.${hint}` }, { status: 500 });
  }

  return NextResponse.json({ ad: toAdRecord(inserted), copySource: copy.source });
}
