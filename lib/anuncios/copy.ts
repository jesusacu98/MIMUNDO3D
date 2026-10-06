import OpenAI from 'openai';
import { BRAND, type AdOptions, type AdProduct, type AdStyle, type AdTypeId } from './config';

// Texto del anuncio (descripción + hashtags) para pegar al publicar. Con llave de OpenAI se pide
// al mismo modelo de texto del chat de ideas (lib/ideas/settings.ts); sin llave, o si la
// respuesta no se puede leer, se arma con plantillas para que el módulo nunca quede inutilizable.

export interface AdCopyVariant {
  label: string;
  text: string;
}

export interface AdCopy {
  variants: AdCopyVariant[];
  /** Ordenados por relevancia: quien publique usa los primeros N (Instagram: 5). */
  hashtags: string[];
  /** Versión corta para estado/chat de WhatsApp, sin hashtags. */
  whatsappText: string;
  /** Frase corta para imprimir sobre la primera imagen del anuncio (sin precio). */
  imageText: string;
  source: 'ia' | 'plantilla';
}

export interface GenerateCopyInput {
  apiKey: string | null;
  model: string;
  style: AdStyle;
  type: AdTypeId;
  products: AdProduct[];
  options: AdOptions;
}

const SYSTEM_PROMPT = `Eres el community manager de MIMUNDO3D, un emprendimiento mexicano de impresión 3D que hace productos personalizados (llaveros, letras, regalos, piezas para negocios, escolares, hogar). Escribes las descripciones que se pegan al publicar un anuncio en Instagram, Facebook y WhatsApp.

Reglas:
- Español de México, tuteo. Nada de voseo.
- Usa SOLO los datos que te doy (nombre, descripción, categoría). No inventes materiales, medidas, tiempos de entrega, garantías, ni promociones que no estén en los datos o en la nota del dueño.
- Cada descripción empieza con un gancho en la primera línea (es lo único que se ve antes del «ver más»), sigue con el beneficio o la historia, y cierra con una invitación a pedirlo por WhatsApp (${BRAND.whatsappDisplay}) o a ver el catálogo completo en ${BRAND.siteDisplay}.
- NO menciones precios ni cantidades de dinero en ningún texto (ni en la oferta: habla del porcentaje de descuento, no del precio).
- EMOJIS (obligatorio): TODAS las descripciones y la versión de WhatsApp llevan emojis para que el texto llame la atención, aunque el tono sea serio (en ese caso, emojis sobrios). Mínimo 3 por descripción: uno en la línea del gancho, uno al inicio de cada punto de una lista y uno en el cierre. Elígelos según el producto (ej. 🔑 llaveros, 🎁 regalos, 🏠 hogar, 🎒 escolares, 🏪 negocios, 📲 contacto, 🛒 catálogo). No repitas el mismo emoji más de dos veces y no pongas emojis en la mitad de una oración. Los hashtags y el campo «image_text» NO llevan emojis.
- Respeta el tono indicado.
- FORMATO (importante): el texto NO es un solo párrafo. Usa saltos de línea reales: el gancho va solo en la primera línea; luego una línea en blanco; después el cuerpo en bloques de 1 a 3 líneas cortas separados por líneas en blanco (si hay varios beneficios o características, ponlos en lista, una por línea, con «•» o un emoji al inicio); otra línea en blanco y al final la invitación a escribir o a ver el catálogo. En el JSON escribe los saltos como \n (un salto) y \n\n (línea en blanco).
- NUNCA pongas hashtags dentro de las descripciones: van aparte.
- Entrega 3 variantes con enfoques distintos: «Corta y directa» (2 a 3 líneas), «Con historia» (4 a 6 líneas) y «De venta» (clara, con llamado a la acción fuerte).
- Hashtags: de 8 a 10, en minúsculas, sin acentos ni espacios, ordenados de más a menos importante, empezando por los más específicos del producto y la categoría. Evita genéricos como #viral, #love o #instagood. Incluye #impresion3d y #mimundo3d.
- «image_text»: una frase breve (de 8 a 16 palabras) que se imprime SOBRE la imagen, porque mucha gente sólo mira la imagen y no lee la descripción. Dice qué es el producto y para qué sirve o por qué lo querrán, en lenguaje simple, sin hashtags, sin emojis y sin precio.
- «whatsapp_text»: una versión de 2 a 4 líneas para estado o chat de WhatsApp, sin hashtags, con el gancho y la invitación a escribir.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['variants', 'hashtags', 'whatsapp_text', 'image_text'],
  properties: {
    variants: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'text'],
        properties: { label: { type: 'string' }, text: { type: 'string' } },
      },
    },
    hashtags: { type: 'array', items: { type: 'string' } },
    whatsapp_text: { type: 'string' },
    image_text: { type: 'string' },
  },
} as const;

const TYPE_BRIEF: Record<AdTypeId, string> = {
  destacado: 'Anuncio de un producto destacado del catálogo.',
  oferta: 'Anuncio de OFERTA con descuento.',
  novedad: 'Anuncio de NOVEDAD: un producto que acaba de llegar al catálogo.',
  coleccion: 'Carrusel de varias piezas de una colección (la descripción acompaña todo el carrusel).',
};

function describeProducts(products: AdProduct[]): string {
  return products
    .map((p, i) => `${i + 1}. ${p.name} — categoría: ${p.category}; descripción: ${p.description || '(sin descripción)'}`)
    .join('\n');
}

/**
 * Garantiza que la descripción tenga párrafos. Si el modelo ya mandó saltos de línea se respetan
 * (sólo se limpian espacios y se limitan las líneas en blanco a una); si devolvió todo en un solo
 * bloque, se separa: gancho solo, cuerpo en grupos de dos oraciones y el cierre aparte.
 */
export function formatCaption(raw: string): string {
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (text.includes('\n')) {
    return text
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }
  const sentences = text.split(/(?<=[.!?…])\s+/u).filter(Boolean);
  if (sentences.length <= 2) return sentences.join('\n\n');
  const hook = sentences[0];
  const closing = sentences[sentences.length - 1];
  const middle = sentences.slice(1, -1);
  const paragraphs: string[] = [hook];
  for (let i = 0; i < middle.length; i += 2) paragraphs.push(middle.slice(i, i + 2).join(' '));
  paragraphs.push(closing);
  return paragraphs.join('\n\n');
}

const EMOJI = /\p{Extended_Pictographic}/u;

/** Si el modelo no puso ningún emoji, se agregan al gancho y al cierre para que el texto no salga plano. */
export function ensureEmojis(text: string, hook = '✨', closing = '📲'): string {
  if (!text || EMOJI.test(text)) return text;
  const lines = text.split('\n');
  lines[0] = `${hook} ${lines[0]}`;
  const last = lines.length - 1;
  if (last > 0 && lines[last].trim()) lines[last] = `${closing} ${lines[last]}`;
  return lines.join('\n');
}

export function sanitizeHashtags(raw: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const tag = item
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9_]/g, '');
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push('#' + tag);
  }
  return out.slice(0, 12);
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function fallbackImageText({ type, products, options }: GenerateCopyInput): string {
  const first = products[0];
  if (type === 'coleccion') return `Piezas personalizadas hechas en 3D: ${products.length} ideas para ti.`;
  if (type === 'oferta') return `${first.name.replace(/\s*[([].*$/, '')} con ${Math.round(options.discountPercent ?? 15)}% de descuento por tiempo limitado.`;
  const firstSentence = (first.description || '').split(/(?<=[.!?])\s/)[0]?.trim();
  return (firstSentence && firstSentence.length <= 140 ? firstSentence : 'Personalizado y hecho en 3D, a tu gusto.');
}

function fallbackCopy(input: GenerateCopyInput): AdCopy {
  const { type, products, options } = input;
  const first = products[0];
  const names = products.map((p) => p.name);
  const pct = options.discountPercent ? Math.round(options.discountPercent) : null;
  const cta = `📲 Escríbenos por WhatsApp al ${BRAND.whatsappDisplay} y lo hacemos a tu gusto.\n🛒 Mira el catálogo completo en ${BRAND.siteDisplay}.`;

  let hook: string;
  if (type === 'oferta') hook = `🔥 ${first.name}${pct ? ` con ${pct}% de descuento` : ' en oferta'}${options.deadline ? ` (${options.deadline})` : ''}`;
  else if (type === 'novedad') hook = `✨ Novedad: ${first.name}`;
  else if (type === 'coleccion') hook = `💖 ${options.title?.trim() || 'Nuestros favoritos'}`;
  else hook = `💖 ${first.name}`;

  const body = type === 'coleccion' ? `Desliza y mira: ${names.join(', ')}.` : first.description || `Hecho en 3D, con tu estilo.`;
  const note = options.note?.trim();
  const text = [hook, body, note, cta].filter(Boolean).join('\n\n');
  const short = [hook, cta].join('\n');

  const tags = sanitizeHashtags([
    'impresion3d',
    'mimundo3d',
    ...products.map((p) => slug(p.category)),
    ...(type === 'oferta' ? ['oferta'] : type === 'novedad' ? ['novedad'] : []),
    'personalizado',
    'hechoen3d',
    'regalospersonalizados',
  ]);

  return {
    variants: [
      { label: 'Corta y directa', text: short },
      { label: 'Con historia', text },
      { label: 'De venta', text: `${hook}\n\n${cta}` },
    ],
    hashtags: tags,
    whatsappText: short,
    imageText: fallbackImageText(input),
    source: 'plantilla',
  };
}

export async function generateAdCopy(input: GenerateCopyInput): Promise<AdCopy> {
  if (!input.apiKey) return fallbackCopy(input);

  const { style, type, products, options } = input;
  const userMessage = [
    TYPE_BRIEF[type],
    `Tono del estilo «${style.label}»: ${style.tone}.`,
    type === 'oferta' ? `Descuento: ${options.discountPercent ?? 15}%${options.deadline ? `; vigencia: ${options.deadline}` : ''}.` : '',
    type === 'coleccion' && options.title ? `Título del carrusel: ${options.title}.` : '',
    options.note?.trim() ? `Nota del dueño (síguela): ${options.note.trim()}` : '',
    'Productos:',
    describeProducts(products),
  ]
    .filter(Boolean)
    .join('\n');

  const client = new OpenAI({ apiKey: input.apiKey, baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined });
  const response = await client.responses.create({
    model: input.model,
    instructions: SYSTEM_PROMPT,
    input: userMessage,
    max_output_tokens: 2000,
    text: { format: { type: 'json_schema', name: 'anuncio', strict: true, schema: SCHEMA as unknown as Record<string, unknown> } },
  });

  try {
    const parsed = JSON.parse(response.output_text ?? '') as { variants?: AdCopyVariant[]; hashtags?: unknown[]; whatsapp_text?: string; image_text?: string };
    const variants = (parsed.variants ?? [])
      .filter((v) => v && typeof v.text === 'string' && v.text.trim())
      .map((v) => ({ label: String(v.label || 'Variante').slice(0, 40), text: ensureEmojis(formatCaption(v.text.replace(/\s*(#\w+\s*)+$/u, ''))) }));
    const hashtags = sanitizeHashtags(parsed.hashtags ?? []);
    if (variants.length === 0) throw new Error('sin variantes');
    return {
      variants,
      hashtags: hashtags.length ? hashtags : fallbackCopy(input).hashtags,
      whatsappText: ensureEmojis(formatCaption(parsed.whatsapp_text ?? '')) || variants[0].text,
      imageText: (parsed.image_text ?? '').trim() || fallbackImageText(input),
      source: 'ia',
    };
  } catch (error) {
    console.error('[anuncios] No se pudo leer la respuesta de la IA, se usa la plantilla:', error);
    return fallbackCopy(input);
  }
}
