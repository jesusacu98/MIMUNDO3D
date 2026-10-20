import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { getIdeaSettings } from '@/lib/ideas/settings';
import { buildDesignPrompt } from '@/lib/disenos/promptBuilder';
import { generateDesignSketches } from '@/lib/disenos/generate';
import { DEFAULT_IMAGE_MODEL } from '@/lib/disenos/models';
import { saveDesign } from '@/lib/disenos/history';
import { notifyAiError } from '@/lib/notify/email';

// `proxy.ts` sólo protege `/admin/:path*`, no `/api/*` — esta ruta re-verifica el rol acá
// (mismo criterio de defensa en profundidad que ya usan las páginas de /admin).
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const formData = await request.formData();
  const description = String(formData.get('description') || '').trim();
  if (!description) {
    return NextResponse.json({ error: 'Describí qué querés diseñar.' }, { status: 400 });
  }

  const countRaw = Number(formData.get('count'));
  const count = Number.isFinite(countRaw) && countRaw > 0 ? countRaw : 4;

  const kind = formData.get('kind') === 'libre' ? 'libre' : 'expositor';

  const model = String(formData.get('model') || '').trim() || DEFAULT_IMAGE_MODEL;

  const referenceImages = formData.getAll('logos').filter((entry): entry is File => entry instanceof File && entry.size > 0);

  const settings = await getIdeaSettings();
  if (!settings.apiKey) {
    return NextResponse.json(
      { error: 'No hay una llave de OpenAI configurada. Configurala en /admin/ideas/configuracion.' },
      { status: 400 },
    );
  }

  try {
    const prompt = buildDesignPrompt({ kind, description, referenceImageCount: referenceImages.length });
    const images = await generateDesignSketches({ apiKey: settings.apiKey, model, prompt, referenceImages, count, portrait: kind === 'expositor' });
    // Se guarda en el historial; si eso falla (p. ej. la tabla aún no existe) se devuelven las
    // imágenes igual, en memoria, para no perder la generación que ya se pagó.
    const design = await saveDesign({ kind, description, model, images });
    // Con historial guardado se devuelven sólo las URLs (el cliente las baja de Storage): evita
    // una respuesta de varios MB en base64.
    return NextResponse.json(design ? { design } : { images });
  } catch (error) {
    console.error('[disenos] Error del proveedor de IA:', error);
    void notifyAiError('disenos', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `No se pudo generar el diseño: ${message}` }, { status: 502 });
  }
}
