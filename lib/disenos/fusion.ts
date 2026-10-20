import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';

// Convierte un boceto generado en un PNG en blanco y negro puro, listo para que el plugin de
// Fusion (Project Salvador, "Canvas to Sketch") lo trace a un boceto: regiones cerradas
// separadas por líneas negras gruesas sobre fondo blanco. El color no hace falta — se pinta
// después en Bambu Studio. No toca el prompt de generación de bocetos (promptBuilder.ts).

const FUSION_PROMPT = [
  'Convierte la pieza de la imagen adjunta en un PLANO 2D PURO, como la plantilla de un patrón de corte (láser/vinil) o un sticker: una silueta plana vista de frente, sin ninguna profundidad.',
  'REGLA PRINCIPAL — TODO ES PLANO: el dibujo es una proyección ortogonal estricta de frente, como si se aplastara la pieza contra el papel. NO existe grosor ni volumen: no dibujar los lados ni el canto de la placa, ni bordes dobles que sugieran espesor, ni caras laterales, ni la base en perspectiva o como bloque 3D, ni esquinas en ángulo, ni líneas que se alejen hacia el fondo. La placa es una silueta plana con un solo contorno; la base es un rectángulo plano de frente (lados verticales y horizontales exactos), dibujado como una figura más al pie de la placa, sin parte superior visible. Los adornos (sombreros, botas, hojas, mascotas, etc.) se dibujan también completamente planos y de frente, como pictogramas o calcomanías, sin perspectiva ni escorzo.',
  'Lienzo: fondo BLANCO liso, la pieza completa centrada y ocupando casi todo el lienzo. Sin mesa, sin reflejos, sin sombras, sin fondo.',
  'Estilo: solo líneas negras sólidas y uniformes de grosor constante y generoso, y rellenos blancos. Cada zona de color de la pieza original es una región CERRADA delimitada por una línea negra, sin huecos en las líneas, para que cada región sea un perfil cerrado. Sin grises, degradados, sombreado, texturas ni tramas.',
  'Conservar la silueta, la posición y la forma de cada elemento: placa, base, logo, textos, íconos de redes, adornos. Simplificar los detalles diminutos: eliminar líneas finas, puntos sueltos y ornamentos menores; cada rasgo debe ser grande y claro. Textos en tipografía gruesa y legible, tal como están.',
  'Los códigos QR se reemplazan por un recuadro cuadrado VACÍO (solo su contorno, sin ningún patrón adentro).',
  'Resultado: dibujo en blanco y negro, totalmente bidimensional, tipo plantilla de recorte, sin color alguno.',
].join(' ');

const MAX_SIDE = 3072;

export interface BuildFusionImageInput {
  apiKey: string;
  /** Modelo de imagen (debe ser de la familia gpt-image-*, la única que admite editar con referencia). */
  model: string;
  /** Boceto de entrada como data URL (png/jpeg/webp). */
  imageDataUrl: string;
}

/** Devuelve el PNG final (en blanco y negro puro) en base64, sin el prefijo data:. */
export async function buildFusionImage({ apiKey, model, imageDataUrl }: BuildFusionImageInput): Promise<string> {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(imageDataUrl);
  if (!match) throw new Error('La imagen del boceto no es válida.');
  const [, mime, b64] = match;
  const ext = mime.split('/')[1];

  const client = new OpenAI({ apiKey });
  const file = await toFile(Buffer.from(b64, 'base64'), `boceto.${ext}`, { type: mime });
  const response = await client.images.edit({
    model,
    image: file,
    prompt: FUSION_PROMPT,
    n: 1,
    size: '1024x1536',
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
