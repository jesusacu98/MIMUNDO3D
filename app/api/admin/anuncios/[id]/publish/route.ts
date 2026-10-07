import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSocialSettings } from '@/lib/social/settings';
import { prepareJpegUrls } from '@/lib/social/prepare';
import { MetaError, publishFacebookPhotos, publishFacebookStory, publishInstagramPost, publishInstagramStory, type Published } from '@/lib/social/meta';
import { toAdRecord } from '@/lib/anuncios/history';
import type { AdPublication } from '@/lib/anuncios/config';

// Convertir las láminas, subirlas, y esperar a que Instagram procese cada contenedor tarda.
export const maxDuration = 120;

type Network = 'instagram' | 'facebook';

interface NetworkResult {
  network: Network;
  ok: boolean;
  items: { id: string; url: string | null }[];
  error?: string;
}

const INSTAGRAM_CAPTION_MAX = 2200;

// `proxy.ts` sólo protege `/admin/:path*`, no `/api/*` — se re-verifica el rol acá.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const { id } = await params;

  const body = (await request.json().catch(() => null)) as {
    networks?: unknown;
    kind?: unknown;
    captions?: { instagram?: unknown; facebook?: unknown };
  } | null;
  if (!body) return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 });

  const networks = (Array.isArray(body.networks) ? body.networks : []).filter((n): n is Network => n === 'instagram' || n === 'facebook');
  const kind: 'post' | 'story' = body.kind === 'story' ? 'story' : 'post';
  if (networks.length === 0) return NextResponse.json({ error: 'Elige dónde publicar.' }, { status: 400 });

  const captions = {
    instagram: typeof body.captions?.instagram === 'string' ? body.captions.instagram.trim() : '',
    facebook: typeof body.captions?.facebook === 'string' ? body.captions.facebook.trim() : '',
  };
  if (kind === 'post' && networks.includes('instagram') && captions.instagram.length > INSTAGRAM_CAPTION_MAX) {
    return NextResponse.json({ error: `La descripción de Instagram pasa de ${INSTAGRAM_CAPTION_MAX} caracteres.` }, { status: 400 });
  }

  const social = await getSocialSettings();
  if (!social.pageId || !social.pageToken) {
    return NextResponse.json({ error: 'Todavía no hay una cuenta conectada. Conéctala en /admin/redes.' }, { status: 400 });
  }
  if (networks.includes('instagram') && !social.igUserId) {
    return NextResponse.json({ error: 'La Página conectada no tiene una cuenta de Instagram vinculada.' }, { status: 400 });
  }

  const { data: row, error: readError } = await supabaseAdmin.from('ad_creatives').select('*').eq('id', id).single();
  if (readError || !row) return NextResponse.json({ error: 'No se encontró el anuncio.' }, { status: 404 });

  let prepared: Awaited<ReturnType<typeof prepareJpegUrls>>;
  try {
    prepared = await prepareJpegUrls(row.image_urls ?? [], `pub-${id.slice(0, 8)}`);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudieron preparar las imágenes.' }, { status: 500 });
  }

  const results: NetworkResult[] = [];
  const newPublications: AdPublication[] = [];

  try {
    for (const network of networks) {
      const result: NetworkResult = { network, ok: false, items: [] };
      try {
        const done: Published[] = [];
        if (kind === 'story') {
          // Una historia por lámina.
          for (const imageUrl of prepared.urls) {
            done.push(
              network === 'instagram'
                ? await publishInstagramStory({ igUserId: social.igUserId!, token: social.pageToken, imageUrl })
                : await publishFacebookStory({ pageId: social.pageId, token: social.pageToken, imageUrl }),
            );
          }
        } else if (network === 'instagram') {
          done.push(await publishInstagramPost({ igUserId: social.igUserId!, token: social.pageToken, imageUrls: prepared.urls, caption: captions.instagram }));
        } else {
          done.push(await publishFacebookPhotos({ pageId: social.pageId, token: social.pageToken, imageUrls: prepared.urls, caption: captions.facebook }));
        }
        result.ok = true;
        result.items = done;
        const at = new Date().toISOString();
        for (const d of done) newPublications.push({ network, kind, id: d.id, url: d.url, at });
      } catch (error) {
        console.error(`[social] Error al publicar en ${network}:`, error);
        result.error = error instanceof MetaError || error instanceof Error ? error.message : String(error);
        // Si fallaron algunas historias pero otras sí salieron, se conserva lo publicado.
        result.items = newPublications.filter((p) => p.network === network).map((p) => ({ id: p.id, url: p.url }));
      }
      results.push(result);
    }
  } finally {
    await prepared.cleanup();
  }

  let ad = toAdRecord(row);
  if (newPublications.length > 0) {
    const published = [...ad.published, ...newPublications];
    const { data: updated } = await supabaseAdmin.from('ad_creatives').update({ published }).eq('id', id).select('*').single();
    ad = updated ? toAdRecord(updated) : { ...ad, published };
  }

  return NextResponse.json({ results, ad });
}
