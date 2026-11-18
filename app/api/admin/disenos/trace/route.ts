import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { getIdeaSettings } from '@/lib/ideas/settings';
import { buildExactTrace } from '@/lib/disenos/trace';

// "Trazado exacto": traza la foto sin IA de imagen (lib/disenos/trace.ts). Es independiente de
// "Imagen para Fusion" (ruta fusion): no la reemplaza ni comparte su prompt. No se guarda en el
// historial. El único uso de IA es ubicar la pieza para recortar la foto (modelo de texto); sin
// llave configurada se traza la foto completa.
export const maxDuration = 120;

const MAX_IMAGE_CHARS = 3_000_000;

// `proxy.ts` sólo protege `/admin/:path*`, no `/api/*` — se re-verifica el rol acá.
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const image = typeof body?.image === 'string' ? body.image : '';
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(image) || image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: 'La imagen del boceto no es válida.' }, { status: 400 });
  }

  try {
    const settings = await getIdeaSettings();
    const trace = await buildExactTrace({ imageDataUrl: image, apiKey: settings.apiKey, textModel: settings.model });
    return NextResponse.json({ png: trace.png.toString('base64'), svg: trace.svg, ratio: trace.ratio, shapes: trace.shapes });
  } catch (error) {
    console.error('[disenos/trace] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `No se pudo trazar la imagen: ${message}` }, { status: 500 });
  }
}
