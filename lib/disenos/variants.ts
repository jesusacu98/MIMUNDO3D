import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';
import { pickCanvas } from '@/lib/disenos/canvas';

// Modo "Variantes de colores": el dueño ya tiene sus expositores establecidos y sólo cambia los
// colores y el logo. Se le pasa el diseño base (foto) y el logo del cliente; el modelo de texto
// con visión propone paletas a partir del logo y el modelo de imagen redibuja el MISMO diseño
// con cada paleta y con el logo del cliente en lugar del original.

export const MAX_VARIANTS = 4;

export interface Palette {
  name: string;
  /** Colores en #RRGGBB. QR siempre blanco y negro, no se tocan. */
  plate: string;
  /** Hasta 4 colores del logo, simplificados (iguales en todas las paletas: el logo no se recolorea). */
  logo: string[];
  relief: string;
  accent: string;
  base: string;
}

const HEX = /^#[0-9a-f]{6}$/i;

const PALETTE_PROMPT = (count: number, notes: string) =>
  [
    'La imagen es el logo de un negocio. Se va a poner en un expositor de mesa impreso en 3D (placa plana de un color, base, íconos de redes y tarjeta, con letras en relieve) y hay que proponer combinaciones de color para el RESTO de la pieza, sin tocar los colores del logo.',
    'Paso 1 — logo: simplifica el logo a un MÁXIMO de 4 colores planos que conserven la mayoría de sus colores reales (por ejemplo azul, rojo, crema y azul marino oscuro); fusiona los tonos parecidos y descarta degradados. Devuélvelos en "logo" (de 1 a 4 colores #RRGGBB, los más fieles al original). Estos colores NO cambian entre combinaciones.',
    `Paso 2 — combinaciones: entrega EXACTAMENTE ${count} paletas distintas entre sí, cada una con: name (2 a 4 palabras en español, p. ej. «Azul clásico», «Oscura con lima»), plate (color de la placa donde va el logo), relief (color de los textos y relieves pequeños), accent (íconos de redes y tarjeta) y base (color de la base).`,
    'Reglas: colores planos y saturados que existan como filamento PLA; el logo tiene que leerse bien sobre plate, así que plate debe contrastar con los colores principales del logo (no uses un plate igual al color dominante del logo); relief con buen contraste contra plate; accent distinto de plate; sin degradados. La primera paleta es la más fiel a la marca (la placa y demás en colores que ya aparecen en el logo, siempre que contrasten); las demás son combinaciones variadas (una clara, una oscura, una de contraste fuerte) que se sigan sintiendo de la marca.',
    notes ? `Indicaciones del dueño que debes respetar: ${notes}.` : '',
    'Responde SOLO con JSON plano, sin texto alrededor: {"logo":["#RRGGBB"],"palettes":[{"name":"...","plate":"#RRGGBB","relief":"#RRGGBB","accent":"#RRGGBB","base":"#RRGGBB"}]}.',
  ]
    .filter(Boolean)
    .join(' ');

/** Paletas sugeridas por el modelo de texto a partir del logo. Lanza si no devuelve nada usable. */
export async function proposePalettes({
  apiKey,
  textModel,
  logo,
  count,
  notes,
}: {
  apiKey: string;
  textModel: string;
  logo: Buffer;
  count: number;
  notes: string;
}): Promise<Palette[]> {
  const preview = await sharp(logo)
    .flatten({ background: '#ffffff' })
    .resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: textModel,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: PALETTE_PROMPT(count, notes) },
          { type: 'input_image', image_url: `data:image/jpeg;base64,${preview.toString('base64')}`, detail: 'high' },
        ],
      },
    ],
    max_output_tokens: 3000,
  });

  const match = /\{[\s\S]*\}/.exec(response.output_text ?? '');
  if (!match) throw new Error('El modelo no devolvió paletas.');
  const parsed = JSON.parse(match[0]) as { logo?: unknown[]; palettes?: Array<Record<string, unknown>> };
  const raw = parsed.palettes ?? [];
  const logoColors = (parsed.logo ?? []).map((c) => String(c ?? '').trim()).filter((c) => HEX.test(c)).slice(0, 4);
  if (logoColors.length === 0) throw new Error('El modelo no devolvió los colores del logo.');
  const palettes = raw
    .map((p): Palette | null => {
      const colors = [p.plate, p.relief, p.accent, p.base].map((c) => String(c ?? '').trim());
      if (!colors.every((c) => HEX.test(c))) return null;
      return {
        name: String(p.name ?? '').trim().slice(0, 40) || 'Paleta',
        plate: colors[0],
        logo: logoColors,
        relief: colors[1],
        accent: colors[2],
        base: colors[3],
      };
    })
    .filter((p): p is Palette => p !== null)
    .slice(0, count);
  if (palettes.length === 0) throw new Error('El modelo no devolvió paletas válidas.');
  return palettes;
}

const variantPrompt = (palette: Palette, notes: string) =>
  [
    'Se adjuntan dos imágenes: la PRIMERA es un expositor de mesa impreso en 3D (el diseño base) y la SEGUNDA es el logo del cliente.',
    'Rehaz el diseño base EXACTAMENTE igual —misma forma de la placa y de la base, misma composición, mismos íconos de redes, recuadros de QR, tarjeta, adornos, textos, proporciones, toma y fondo— cambiando SOLO dos cosas:',
    `1) El logo: reemplaza el logo o nombre del diseño base por el logo de la segunda imagen, en la misma posición y tamaño, sin deformarlo ni cambiar su proporción. El logo CONSERVA SUS PROPIOS COLORES, NO lo pintes con los colores de la paleta: se reproduce como piezas planas de filamento liso usando únicamente estos ${palette.logo.length} colores, asignando a cada zona del logo el más parecido a su color original: ${palette.logo.join(', ')}. Sin degradados ni más colores dentro del logo; mantén todos sus detalles grandes y su silueta.`,
    `2) Los colores del resto de la pieza, con esta paleta de filamento liso y plano (sin degradados): placa ${palette.plate}; textos y relieves pequeños ${palette.relief}; íconos de redes y tarjeta ${palette.accent}; base ${palette.base}. Los QR se quedan en blanco y negro. No agregues otros colores.`,
    'Todo lo demás permanece idéntico. Cada elemento de un solo color plano y liso, como PLA; sin sombreado pintado ni texturas dibujadas.',
    notes ? `Indicaciones extra: ${notes}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

/** Redibuja el diseño base con cada paleta (una edición de imagen por paleta, en paralelo). */
export async function generateColorVariants({
  apiKey,
  model,
  base,
  logo,
  palettes,
  notes,
}: {
  apiKey: string;
  model: string;
  base: File;
  logo: File;
  palettes: Palette[];
  notes: string;
}): Promise<Array<{ image: string; palette: Palette }>> {
  const client = new OpenAI({ apiKey });
  const baseBuffer = Buffer.from(await base.arrayBuffer());
  const meta = await sharp(baseBuffer).metadata();
  const canvas = pickCanvas((meta.width ?? 1) / (meta.height ?? 1));

  const results = await Promise.allSettled(
    palettes.map(async (palette) => {
      // Un File nuevo por llamada: el SDK consume el contenido al subirlo.
      const files = [
        await toFile(baseBuffer, 'base.png', { type: base.type || 'image/png' }),
        await toFile(Buffer.from(await logo.arrayBuffer()), 'logo.png', { type: logo.type || 'image/png' }),
      ];
      const response = await client.images.edit({
        model,
        image: files,
        prompt: variantPrompt(palette, notes),
        n: 1,
        size: canvas.size,
        quality: 'auto',
      });
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error('El modelo no devolvió ninguna imagen.');
      return `data:image/png;base64,${b64}`;
    }),
  );

  // Si alguna paleta falló se omite; cada imagen conserva su paleta.
  const images = results.flatMap((r, i) => (r.status === 'fulfilled' ? [{ image: r.value, palette: palettes[i] }] : []));
  if (images.length === 0) {
    const first = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    throw first?.reason ?? new Error('No se pudo generar ninguna variante.');
  }
  return images;
}
