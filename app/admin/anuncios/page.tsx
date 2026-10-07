import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getIdeaSettings } from '@/lib/ideas/settings';
import { getSocialSettings, toSafeView } from '@/lib/social/settings';
import { toAdRecord } from '@/lib/anuncios/history';
import AnunciosClient, { type PickerProduct } from './AnunciosClient';

const HISTORY_LIMIT = 30;

export default async function AnunciosPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ data: productRows }, { data: categoryRows }, historyResult, settings, socialSettings] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('id, name, price, is_starting_price, image_url, category_id, is_new, is_promo')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabaseAdmin.from('product_categories').select('id, name').order('display_order', { ascending: true }),
    supabaseAdmin.from('ad_creatives').select('*').order('created_at', { ascending: false }).limit(HISTORY_LIMIT),
    getIdeaSettings(),
    getSocialSettings(),
  ]);

  const categoryName = new Map((categoryRows ?? []).map((c) => [c.id, c.name]));
  const products: PickerProduct[] = (productRows ?? [])
    .filter((p) => p.image_url)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      isStartingPrice: p.is_starting_price,
      imageUrl: p.image_url,
      category: categoryName.get(p.category_id) ?? '',
      isNew: p.is_new,
      isPromo: p.is_promo,
    }));

  // Si la tabla del historial todavía no existe (no se corrió schema_anuncios.sql), la pantalla
  // funciona igual pero avisa que no se podrán guardar los anuncios.
  const historyMissing = Boolean(historyResult.error);
  const history = (historyResult.data ?? []).map(toAdRecord);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Generador de anuncios</h1>
          <p className="text-zinc-600 max-w-3xl">
            Elegí un producto (o varios para un carrusel), un estilo y un formato: se arma la imagen con la foto real del producto y el
            logo, y se escribe la descripción con hashtags lista para pegar en Instagram, Facebook o WhatsApp.
          </p>
        </div>

        <AnunciosClient products={products} initialHistory={history} historyMissing={historyMissing} aiEnabled={Boolean(settings.apiKey) && settings.provider !== 'mock'} social={toSafeView(socialSettings)} />
      </main>
    </div>
  );
}
