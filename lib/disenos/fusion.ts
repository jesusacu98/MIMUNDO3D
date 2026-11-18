import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';
import { cropToPiece, pickCanvas } from '@/lib/disenos/canvas';

// Convierte un boceto generado en un PNG en blanco y negro puro, listo para que el plugin de
// Fusion (Project Salvador, "Canvas to Sketch") lo trace a un boceto: regiones cerradas
// separadas por líneas negras gruesas sobre fondo blanco. El color no hace falta — se pinta
// después en Bambu Studio. No toca el prompt de generación de bocetos (promptBuilder.ts).

const FUSION_PROMPT = [
  'Convierte la pieza de la imagen adjunta en un PLANO 2D PURO, como la plantilla de un patrón de corte (láser/vinil) o un sticker: una silueta plana vista de frente, sin ninguna profundidad.',
  'REGLA PRINCIPAL — TODO ES PLANO: el dibujo es una proyección ortogonal estricta de frente, como si se aplastara la pieza contra el papel. NO existe grosor ni volumen: no dibujar los lados ni el canto de la placa, ni bordes dobles que sugieran espesor, ni caras laterales, ni la base en perspectiva o como bloque 3D, ni esquinas en ángulo, ni líneas que se alejen hacia el fondo. La placa es una silueta plana con un solo contorno; la base es un rectángulo plano de frente (lados verticales y horizontales exactos), dibujado como una figura más al pie de la placa, sin parte superior visible. Los adornos (sombreros, botas, hojas, mascotas, etc.) se dibujan también completamente planos y de frente, como pictogramas o calcomanías, sin perspectiva ni escorzo.',
  'Lienzo: fondo BLANCO liso, la pieza completa centrada y lo más grande posible SIN cambiar su proporción. PROPORCIÓN GENERAL: la pieza conserva exactamente la relación ancho/alto que tiene en la imagen adjunta (si es más ancha que alta, el dibujo es más ancho que alto, en la misma medida); NUNCA se estira ni se comprime para llenar el lienzo: si sobra espacio arriba, abajo o a los lados, queda en blanco. Sin mesa, sin reflejos, sin sombras, sin fondo.',
  'Estilo: solo líneas negras sólidas y uniformes de grosor constante y generoso, y rellenos blancos. Cada zona de color de la pieza original es una región CERRADA delimitada por una línea negra, sin huecos en las líneas, para que cada región sea un perfil cerrado. Sin grises, degradados, sombreado, texturas ni tramas.',
  'ENDEREZAR LA PERSPECTIVA: la foto adjunta suele estar tomada en ángulo (tres cuartos), así que las formas se ven comprimidas a lo ancho y los lados de la pieza son visibles. NO copies esa deformación: reconstruye la vista FRONTAL exacta, como si la cámara estuviera de frente y perpendicular a la placa. Al hacerlo, lo que en la foto parece un óvalo achatado es en realidad un círculo PERFECTO (ancho = alto), los recuadros de QR y los botones son cuadrados exactos, los íconos de redes son círculos perfectos, y la placa recupera su ancho real (más ancha que en la foto). Descarta por completo los lados y el grosor de la pieza.',
  'Conservar la silueta, la posición y la forma de cada elemento: placa, base, logo, textos, íconos de redes, adornos. Simplificar los detalles diminutos: eliminar líneas finas, puntos sueltos y ornamentos menores; cada rasgo debe ser grande y claro. Textos en tipografía gruesa y legible, tal como están.',
  'Los códigos QR se reemplazan por un recuadro cuadrado VACÍO (solo su contorno, sin ningún patrón adentro).',
  'Las tarjetas bancarias y los recuadros con datos bancarios (nombre del banco, CLABE, número de cuenta o de tarjeta, titular, chip, símbolo o etiqueta NFC) también se reemplazan por un recuadro VACÍO del mismo tamaño, forma y posición (solo su contorno, con sus esquinas redondeadas): no se dibuja ningún texto, número, logo ni símbolo adentro.',
  'Resultado: dibujo en blanco y negro, totalmente bidimensional, tipo plantilla de recorte, sin color alguno.',
].join(' ');

// Variante opcional (botón "proporciones estrictas" del convertidor): refuerza que las formas
// redondas y cuadradas salgan exactas. Para quitarla: borrar esta constante, el parámetro `strict`
// de buildFusionImage, el campo `strict` de la ruta fusion y el segundo botón de DisenosForm.tsx.
const STRICT_ADDENDUM = [
  'REVISIÓN FINAL DE PROPORCIONES (obligatoria, antes de entregar el dibujo): el círculo grande del logo (o cualquier placa/emblema circular) tiene que medir EXACTAMENTE lo mismo de ancho que de alto, como trazado con un compás; si te sale más alto que ancho, ensánchalo hasta que sea un círculo perfecto, aunque tengas que mover los elementos de alrededor. Lo mismo con los círculos de los íconos de redes (compás) y con los recuadros de QR (cuadrados exactos, lados idénticos, esquinas redondeadas iguales). Las reglas de proporciones pesan más que copiar la silueta de la foto.',
].join(' ');

const MAX_SIDE = 3072;

export interface BuildFusionImageInput {
  apiKey: string;
  /** Modelo de imagen (debe ser de la familia gpt-image-*, la única que admite editar con referencia). */
  model: string;
  /** Boceto de entrada como data URL (png/jpeg/webp). */
  imageDataUrl: string;
  /** Añade la revisión estricta de proporciones al prompt (ver STRICT_ADDENDUM). */
  strict?: boolean;
  /** Modelo de texto con visión para ubicar la pieza y recortar la foto; sin él no se recorta. */
  textModel?: string;
}

/** Devuelve el PNG final (en blanco y negro puro) en base64, sin el prefijo data:. */
export async function buildFusionImage({ apiKey, model, imageDataUrl, strict, textModel }: BuildFusionImageInput): Promise<string> {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(imageDataUrl);
  if (!match) throw new Error('La imagen del boceto no es válida.');
  const [, , b64] = match;

  // La foto se recorta primero a la pieza: el lienzo tiene que seguir la forma de la PIEZA, no la
  // de la foto. Un expositor horizontal en una foto vertical, convertido en lienzo vertical, salía
  // estirado hacia arriba porque el modelo intenta llenar el lienzo. Después se completa con
  // blanco hasta la proporción exacta del lienzo, para que nada se estire.
  const original = Buffer.from(b64, 'base64');
  const input = textModel ? await cropToPiece(original, { apiKey, model: textModel }) : original;
  const inMeta = await sharp(input).metadata();
  const canvas = pickCanvas((inMeta.width ?? 1) / (inMeta.height ?? 1));
  const padded = await sharp(input)
    .resize({ width: canvas.w, height: canvas.h, fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer();

  const client = new OpenAI({ apiKey });
  const file = await toFile(padded, 'boceto.png', { type: 'image/png' });
  const response = await client.images.edit({
    model,
    image: file,
    prompt: strict ? `${FUSION_PROMPT} ${STRICT_ADDENDUM}` : FUSION_PROMPT,
    n: 1,
    size: canvas.size,
    quality: 'high',
  });

  const out = response.data?.[0]?.b64_json;
  if (!out) throw new Error('El modelo no devolvió ninguna imagen.');

  // Binarización determinista: aunque el modelo deje grises o ruido, el PNG final es 100%
  // blanco/negro. Se amplía (suave) antes del umbral para que los bordes salgan lisos.
  const buffer = Buffer.from(out, 'base64');
  const meta = await sharp(buffer).metadata();
  const scale = Math.min(2, MAX_SIDE / Math.max(meta.width ?? 1024, meta.height ?? 1024));
  const png = await sharp(buffer)
    .flatten({ background: '#ffffff' })
    .grayscale()
    .resize({ width: Math.round((meta.width ?? 1024) * scale), kernel: 'lanczos3' })
    .blur(0.8)
    .threshold(140)
    .png({ palette: true, colours: 2, compressionLevel: 9 })
    .toBuffer();

  return png.toString('base64');
}
