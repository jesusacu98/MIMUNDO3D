import OpenAI from 'openai';

// Techo duro del lado del servidor, independiente de lo que pida el formulario: controla el
// costo de una llamada aunque el fetch se arme a mano.
const MAX_COUNT = 4;

export interface GenerateDesignSketchesInput {
  apiKey: string;
  /** Id del modelo de imagen a usar (elegido en /admin/disenos, ver lib/disenos/models.ts). */
  model: string;
  prompt: string;
  /** Imágenes de referencia (logo, ejemplos de forma/estilo...), si el usuario adjuntó alguna. */
  referenceImages?: File[];
  count: number;
}

/** Genera bocetos/mockups (no un modelo 3D) en base64, listos para mostrar/descargar. */
export async function generateDesignSketches({
  apiKey,
  model,
  prompt,
  referenceImages,
  count,
}: GenerateDesignSketchesInput): Promise<string[]> {
  const client = new OpenAI({ apiKey });
  const n = Math.min(Math.max(1, Math.round(count)), MAX_COUNT);
  const images = (referenceImages ?? []).filter((file) => file.size > 0);

  // Calidad "auto" a propósito: es la única que funciona igual en toda la lista de modelos
  // elegibles (los gpt-image-* aceptan low/medium/high/auto, pero dall-e-3 sólo standard/hd y
  // dall-e-2 sólo standard) — "auto" deja que cada modelo resuelva su propio default razonable.
  // `images.edit` acepta una o varias imágenes de referencia (hasta 16 según la API de OpenAI).
  const response: OpenAI.ImagesResponse =
    images.length > 0
      ? await client.images.edit({ model, image: images, prompt, n, size: '1024x1024', quality: 'auto' })
      : await client.images.generate({ model, prompt, n, size: '1024x1024', quality: 'auto' });

  return (response.data ?? [])
    .filter((image): image is OpenAI.Image & { b64_json: string } => Boolean(image.b64_json))
    .map((image) => `data:image/png;base64,${image.b64_json}`);
}
