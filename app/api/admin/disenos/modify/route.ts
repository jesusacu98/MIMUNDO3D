import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { getIdeaSettings } from '@/lib/ideas/settings';
import { modifyDesignSketch } from '@/lib/disenos/modify';
import { DEFAULT_IMAGE_MODEL } from '@/lib/disenos/models';
import { appendDesignImage } from '@/lib/disenos/history';
import { notifyAiError } from '@/lib/notify/email';

// Una edición de imagen con el boceto como referencia.
export const maxDuration = 120;

const MAX_IMAGE_CHARS = 3_000_000;
const MAX_INSTRUCTIONS_CHARS = 1000;

// `proxy.ts` sólo protege `/admin/:path*`, no `/api/*` — se re-verifica el rol acá.
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const image = typeof body?.image === 'string' ? body.image : '';
  const instructions = typeof body?.instructions === 'string' ? body.instructions.trim() : '';
  const designId = typeof body?.designId === 'string' ? body.designId : '';
  const kind = body?.kind === 'libre' ? 'libre' : 'expositor';
  const requestedModel = typeof body?.model === 'string' ? body.model.trim() : '';
  // Sólo la familia gpt-image-* admite editar con una imagen de referencia como se usa acá.
  const model = requestedModel.startsWith('gpt-image') ? requestedModel : DEFAULT_IMAGE_MODEL;

  if (!instructions || instructions.length > MAX_INSTRUCTIONS_CHARS) {
    return NextResponse.json({ error: 'Escribí qué querés cambiar del diseño.' }, { status: 400 });
  }
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
    const modified = await modifyDesignSketch({ apiKey: settings.apiKey, model, kind, imageDataUrl: image, instructions });
    // Con historial se agrega a la misma generación y se devuelve el registro; si falla (o no hay
    // historial) se devuelve la imagen en memoria para no perder lo que ya se pagó.
    const design = designId ? await appendDesignImage(designId, modified, instructions) : null;
    return NextResponse.json(design ? { design } : { image: modified });
  } catch (error) {
    console.error('[disenos/modify] Error:', error);
    if (error instanceof OpenAI.APIError) void notifyAiError('disenos', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `No se pudo modificar el diseño: ${message}` }, { status: 502 });
  }
}
