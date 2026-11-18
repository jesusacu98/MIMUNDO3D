import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { getIdeaSettings } from '@/lib/ideas/settings';
import { generateColorVariants, MAX_VARIANTS, proposePalettes } from '@/lib/disenos/variants';
import { DEFAULT_IMAGE_MODEL } from '@/lib/disenos/models';
import { saveDesign } from '@/lib/disenos/history';
import { notifyAiError } from '@/lib/notify/email';

// Una llamada de texto con visión + hasta 4 ediciones de imagen en paralelo.
export const maxDuration = 300;

const MAX_FILE_BYTES = 8 * 1024 * 1024;

// `proxy.ts` sólo protege `/admin/:path*`, no `/api/*` — se re-verifica el rol acá.
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const formData = await request.formData();
  const base = formData.get('base');
  const logo = formData.get('logo');
  const notes = String(formData.get('notes') || '').trim().slice(0, 500);
  const countRaw = Number(formData.get('count'));
  const count = Math.min(MAX_VARIANTS, Math.max(1, Number.isFinite(countRaw) ? Math.round(countRaw) : 4));
  const requestedModel = String(formData.get('model') || '').trim();
  // Editar con imágenes de referencia sólo lo admite la familia gpt-image-*.
  const model = requestedModel.startsWith('gpt-image') ? requestedModel : DEFAULT_IMAGE_MODEL;

  if (!(base instanceof File) || base.size === 0 || !(logo instanceof File) || logo.size === 0) {
    return NextResponse.json({ error: 'Subí el diseño base y el logo del cliente.' }, { status: 400 });
  }
  if (!base.type.startsWith('image/') || !logo.type.startsWith('image/') || base.size > MAX_FILE_BYTES || logo.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'Las imágenes deben ser png, jpg o webp de hasta 8 MB.' }, { status: 400 });
  }

  const settings = await getIdeaSettings();
  if (!settings.apiKey) {
    return NextResponse.json(
      { error: 'No hay una llave de OpenAI configurada. Configurala en /admin/ideas/configuracion.' },
      { status: 400 },
    );
  }

  try {
    const palettes = await proposePalettes({
      apiKey: settings.apiKey,
      textModel: settings.model,
      logo: Buffer.from(await logo.arrayBuffer()),
      count,
      notes,
    });
    const results = await generateColorVariants({ apiKey: settings.apiKey, model, base, logo, palettes, notes });

    const description = `Variantes de colores: ${results.map((r) => r.palette.name).join(' · ')}`;
    const design = await saveDesign({ kind: 'expositor', description, model, images: results.map((r) => r.image) });
    const paletteList = results.map((r) => r.palette);
    return NextResponse.json(design ? { design, palettes: paletteList } : { images: results.map((r) => r.image), palettes: paletteList });
  } catch (error) {
    console.error('[disenos/variants] Error del proveedor de IA:', error);
    void notifyAiError('disenos', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `No se pudieron generar las variantes: ${message}` }, { status: 502 });
  }
}
