import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { getIdeaSettings } from '@/lib/ideas/settings';
import { buildFusionImage } from '@/lib/disenos/fusion';
import { DEFAULT_IMAGE_MODEL } from '@/lib/disenos/models';
import { saveFusionImage } from '@/lib/disenos/history';
import { notifyAiError } from '@/lib/notify/email';

// Una edición de imagen (calidad alta) + el procesado con sharp.
export const maxDuration = 120;

const MAX_IMAGE_CHARS = 3_000_000;

// `proxy.ts` sólo protege `/admin/:path*`, no `/api/*` — se re-verifica el rol acá.
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const image = typeof body?.image === 'string' ? body.image : '';
  const designId = typeof body?.designId === 'string' ? body.designId : '';
  const indexRaw = Number(body?.index);
  const strict = body?.strict === true;
  const requestedModel = typeof body?.model === 'string' ? body.model.trim() : '';
  // Sólo la familia gpt-image-* admite editar con una imagen de referencia como se usa acá.
  const model = requestedModel.startsWith('gpt-image') ? requestedModel : DEFAULT_IMAGE_MODEL;

  if (!/^data:image\/(png|jpeg|webp);base64,/.test(image) || image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: 'La imagen del boceto no es válida.' }, { status: 400 });
  }

  const settings = await getIdeaSettings();
  if (!settings.apiKey) {
    return NextResponse.json(
      { error: 'No hay una llave de OpenAI configurada. Configurala en /admin/ideas/configuracion.' },
      { status: 400 },
    );
  }

  try {
    const png = await buildFusionImage({ apiKey: settings.apiKey, model, imageDataUrl: image, strict });
    const url = designId && Number.isInteger(indexRaw) && indexRaw >= 0 ? await saveFusionImage(designId, indexRaw, png) : null;
    return NextResponse.json({ png, url });
  } catch (error) {
    console.error('[disenos/fusion] Error:', error);
    if (error instanceof OpenAI.APIError) void notifyAiError('disenos', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `No se pudo preparar la imagen para Fusion: ${message}` }, { status: 502 });
  }
}
