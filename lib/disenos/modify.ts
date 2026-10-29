import OpenAI, { toFile } from 'openai';
import type { DesignKind } from '@/lib/disenos/promptBuilder';

// Edita un boceto ya generado con una instrucción nueva ("me gustó, pero agregale tal elemento").
// Usa images.edit con el boceto como referencia, así que sólo sirve con la familia gpt-image-*.

const KEEP_RULES: Record<DesignKind, string> = {
  expositor:
    'Mantener el estilo de foto realista de producto de un expositor impreso en 3D: cada elemento de un solo color plano y liso, paleta cerrada de pocos colores, rasgos grandes y sin detalles diminutos, una sola pieza apoyada sobre su base.',
  libre:
    'Mantener el estilo de boceto de producto de impresión 3D FDM: sólido único y continuo apoyable sobre una base plana, sin partes flotantes ni voladizos imposibles, espesores razonables.',
};

export function buildModifyPrompt(kind: DesignKind, instructions: string): string {
  return [
    'Modifica la pieza de la imagen adjunta aplicando SOLO el cambio indicado abajo; conserva todo lo demás igual (forma, colores, textos, composición, toma y fondo).',
    `Cambio pedido: ${instructions.trim()}.`,
    KEEP_RULES[kind],
  ].join(' ');
}

export interface ModifyDesignInput {
  apiKey: string;
  /** Modelo de imagen (familia gpt-image-*, la única que admite editar con referencia). */
  model: string;
  kind: DesignKind;
  /** Boceto a modificar como data URL (png/jpeg/webp). */
  imageDataUrl: string;
  instructions: string;
}

/** Devuelve la imagen modificada como data URL PNG en base64. */
export async function modifyDesignSketch({ apiKey, model, kind, imageDataUrl, instructions }: ModifyDesignInput): Promise<string> {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(imageDataUrl);
  if (!match) throw new Error('La imagen del boceto no es válida.');
  const [, mime, b64] = match;

  const client = new OpenAI({ apiKey });
  const file = await toFile(Buffer.from(b64, 'base64'), `boceto.${mime.split('/')[1]}`, { type: mime });
  const response = await client.images.edit({
    model,
    image: file,
    prompt: buildModifyPrompt(kind, instructions),
    n: 1,
    size: kind === 'expositor' ? '1024x1536' : '1024x1024',
    quality: 'auto',
  });

  const out = response.data?.[0]?.b64_json;
  if (!out) throw new Error('El modelo no devolvió ninguna imagen.');
  return `data:image/png;base64,${out}`;
}
