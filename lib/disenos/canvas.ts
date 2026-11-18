import OpenAI from 'openai';
import sharp from 'sharp';

// Los gpt-image-* sólo generan/editan en tres lienzos. Estas utilidades eligen el que mejor
// calza con la forma real de la PIEZA (no de la foto): un expositor horizontal fotografiado en
// una foto vertical, convertido en un lienzo vertical, sale estirado hacia arriba ("aplastado").

export type CanvasSize = '1024x1536' | '1024x1024' | '1536x1024';

export interface Canvas {
  size: CanvasSize;
  w: number;
  h: number;
}

/** Lienzo más cercano a una proporción ancho/alto (cortes en la media geométrica: 1.22 y 0.82). */
export function pickCanvas(ratio: number): Canvas {
  if (ratio > 1.22) return { size: '1536x1024', w: 1536, h: 1024 };
  if (ratio < 0.82) return { size: '1024x1536', w: 1024, h: 1536 };
  return { size: '1024x1024', w: 1024, h: 1024 };
}

const LOCATE_PROMPT = [
  'En la imagen hay UNA pieza de producto (por ejemplo un expositor de mesa: una placa con su base y sus adornos) fotografiada sobre una mesa con un fondo.',
  'Devuelve el rectángulo que encierra la pieza COMPLETA: la placa, la base y cualquier adorno que sobresalga del borde. No incluyas la mesa, los reflejos, las sombras ni el fondo.',
  'Usa coordenadas enteras de 0 a 1000, relativas al ancho (x) y al alto (y) de la imagen, con el origen arriba a la izquierda.',
  'Si la pieza tiene una tarjeta bancaria o un recuadro con datos bancarios (banco, CLABE, número de cuenta o de tarjeta, titular), devuelve también el rectángulo de ESE recuadro en tx0, ty0, tx1, ty1 (mismas coordenadas); si no tiene, pon los cuatro en 0.',
  'Responde SOLO con JSON plano, sin texto alrededor: {"x0": izquierda, "y0": arriba, "x1": derecha, "y1": abajo, "tx0": 0, "ty0": 0, "tx1": 0, "ty1": 0}. Si no hay una pieza reconocible, responde con todo en 0.',
].join(' ');

// Margen que se deja alrededor de la pieza detectada (fracción de su tamaño): cubre la
// imprecisión del modelo para que nunca se corte un borde.
const MARGIN = 0.06;

/** Rectángulo en fracciones (0-1) del ancho/alto de una imagen. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface LocatedPiece {
  /** La foto recortada a la pieza (o la original si no se pudo ubicar). */
  image: Buffer;
  /** Recuadro de datos bancarios, en fracciones de `image`; null si no hay o no se ubicó. */
  bankCard: Box | null;
}

/**
 * Recorta la foto a la pieza, ubicándola con el modelo de texto con visión. Devuelve la imagen
 * recortada, o la original si no se pudo ubicar (o si la pieza ya ocupa casi toda la foto).
 * Nunca lanza: la conversión sigue como antes si esto falla.
 */
export async function cropToPiece(input: Buffer, options: { apiKey: string; model: string }): Promise<Buffer> {
  return (await locatePiece(input, options)).image;
}

/** Como cropToPiece, pero además dice dónde está el recuadro de datos bancarios (si lo hay). */
export async function locatePiece(input: Buffer, { apiKey, model }: { apiKey: string; model: string }): Promise<LocatedPiece> {
  const whole: LocatedPiece = { image: input, bankCard: null };
  try {
    const meta = await sharp(input).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) return whole;

    // Para ubicar la pieza alcanza una copia chica.
    const preview = await sharp(input).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();

    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: LOCATE_PROMPT },
            { type: 'input_image', image_url: `data:image/jpeg;base64,${preview.toString('base64')}`, detail: 'high' },
          ],
        },
      ],
      max_output_tokens: 2000,
    });

    const json = /\{[^{}]*\}/.exec(response.output_text ?? '');
    if (!json) return whole;
    const box = JSON.parse(json[0]) as Record<string, unknown>;
    const [x0, y0, x1, y1] = ['x0', 'y0', 'x1', 'y1'].map((key) => Number(box[key]) / 1000);
    if (![x0, y0, x1, y1].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) return whole;
    const [tx0, ty0, tx1, ty1] = ['tx0', 'ty0', 'tx1', 'ty1'].map((key) => Number(box[key]) / 1000);
    const hasCard = [tx0, ty0, tx1, ty1].every((n) => Number.isFinite(n) && n >= 0 && n <= 1) && tx1 - tx0 > 0.03 && ty1 - ty0 > 0.03;
    const card: Box | null = hasCard ? { x0: tx0, y0: ty0, x1: tx1, y1: ty1 } : null;

    const boxW = x1 - x0;
    const boxH = y1 - y0;
    // Detección sin sentido (muy chica) o pieza que ya llena la foto: no se recorta.
    if (boxW < 0.2 || boxH < 0.2) return whole;
    if (boxW * boxH > 0.85) return { image: input, bankCard: card };

    const left = Math.max(0, Math.floor((x0 - boxW * MARGIN) * width));
    const top = Math.max(0, Math.floor((y0 - boxH * MARGIN) * height));
    const right = Math.min(width, Math.ceil((x1 + boxW * MARGIN) * width));
    const bottom = Math.min(height, Math.ceil((y1 + boxH * MARGIN) * height));
    const image = await sharp(input).extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer();
    // La tarjeta, pasada de coordenadas de la foto a coordenadas del recorte.
    const toCrop = (c: Box): Box => ({
      x0: (c.x0 * width - left) / (right - left),
      y0: (c.y0 * height - top) / (bottom - top),
      x1: (c.x1 * width - left) / (right - left),
      y1: (c.y1 * height - top) / (bottom - top),
    });
    return { image, bankCard: card ? toCrop(card) : null };
  } catch (error) {
    console.error('[disenos/fusion] No se pudo ubicar la pieza para recortarla; se usa la foto completa:', error);
    return whole;
  }
}
