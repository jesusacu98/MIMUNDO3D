import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { getIdeaSettings } from '@/lib/ideas/settings';
import { generateCadModel } from '@/lib/disenos/cad';
import { ScadError } from '@/lib/disenos/scad';
import { notifyAiError } from '@/lib/notify/email';

// Una llamada al modelo (o dos, si hay autocorrección) + el render en WASM.
export const maxDuration = 120;

const MAX_IMAGE_CHARS = 3_000_000;
const MIN_SIZE_MM = 10;
const MAX_SIZE_MM = 300;
const DEFAULT_SIZE_MM = 60;

// `proxy.ts` sólo protege `/admin/:path*`, no `/api/*` — se re-verifica el rol acá.
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const image = typeof body?.image === 'string' ? body.image : '';
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 2000) : '';
  const sizeRaw = Number(body?.maxSizeMm);
  const maxSizeMm = Number.isFinite(sizeRaw) ? Math.min(Math.max(Math.round(sizeRaw), MIN_SIZE_MM), MAX_SIZE_MM) : DEFAULT_SIZE_MM;

  if (!/^data:image\/(png|jpeg|webp);base64,/.test(image) || image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: 'La imagen del boceto no es válida.' }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: 'Falta la descripción de la pieza.' }, { status: 400 });
  }

  const settings = await getIdeaSettings();
  if (!settings.apiKey) {
    return NextResponse.json(
      { error: 'No hay una llave de OpenAI configurada. Configurala en /admin/ideas/configuracion.' },
      { status: 400 },
    );
  }

  try {
    const cad = await generateCadModel({
      apiKey: settings.apiKey,
      model: settings.model,
      imageDataUrl: image,
      description,
      maxSizeMm,
    });
    return NextResponse.json({
      stl: cad.stlBase64,
      scad: cad.scad,
      size: cad.size,
      triangles: cad.triangles,
      warnings: cad.warnings,
    });
  } catch (error) {
    console.error('[disenos/stl] Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    // Un diseño que el modelo no logró escribir no es una caída del proveedor: no se avisa por correo.
    if (error instanceof ScadError) {
      return NextResponse.json({ error: `No se pudo modelar la pieza: ${message}` }, { status: 422 });
    }
    if (error instanceof OpenAI.APIError) void notifyAiError('disenos', error);
    return NextResponse.json({ error: `No se pudo generar el STL: ${message}` }, { status: 502 });
  }
}
