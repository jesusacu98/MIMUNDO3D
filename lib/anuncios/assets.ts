import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Fuentes y logo del anuncio: archivos locales (assets/fonts, public/logo.png). Las fuentes son
// de Google Fonts (licencia OFL). next.config.ts los incluye en el bundle de la ruta con
// `outputFileTracingIncludes`, si no Vercel no los empaqueta porque se leen con fs.

export interface OgFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 700 | 800;
  style: 'normal';
}

let fontsPromise: Promise<OgFont[]> | null = null;

export function loadFonts(): Promise<OgFont[]> {
  fontsPromise ??= (async () => {
    const dir = path.join(process.cwd(), 'assets', 'fonts');
    const [medium, bold, extraBold, bangers, serif] = await Promise.all([
      readFile(path.join(dir, 'Poppins-Medium.ttf')),
      readFile(path.join(dir, 'Poppins-Bold.ttf')),
      readFile(path.join(dir, 'Poppins-ExtraBold.ttf')),
      readFile(path.join(dir, 'Bangers-Regular.ttf')),
      readFile(path.join(dir, 'DMSerifDisplay-Regular.ttf')),
    ]);
    return [
      { name: 'Poppins', data: medium, weight: 500, style: 'normal' },
      { name: 'Poppins', data: bold, weight: 700, style: 'normal' },
      { name: 'Poppins', data: extraBold, weight: 800, style: 'normal' },
      { name: 'Bangers', data: bangers, weight: 400, style: 'normal' },
      { name: 'DM Serif Display', data: serif, weight: 400, style: 'normal' },
    ] satisfies OgFont[];
  })().catch((error) => {
    fontsPromise = null;
    throw error;
  });
  return fontsPromise;
}

let logoPromise: Promise<string> | null = null;

/** El logo del sitio (public/logo.png, el mismo de la cabecera) como data URL. */
export function loadLogo(): Promise<string> {
  logoPromise ??= readFile(path.join(process.cwd(), 'public', 'logo.png'))
    .then((buffer) => `data:image/png;base64,${buffer.toString('base64')}`)
    .catch((error) => {
      logoPromise = null;
      throw error;
    });
  return logoPromise;
}

export const LOGO_RATIO = 997 / 122;

/** Máscara de transparencia que difumina los bordes laterales/verticales de la foto centrada. */
function featherMask(width: number, height: number, featherX: number, featherY: number, horizontal: boolean): Buffer {
  const f = horizontal ? featherX : featherY;
  const len = horizontal ? width : height;
  const edge = Math.min(0.5, f / len);
  const dir = horizontal ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="g" ${dir}>` +
      `<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="${edge}" stop-color="#fff" stop-opacity="1"/>` +
      `<stop offset="${1 - edge}" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>` +
      `</linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/></svg>`,
  );
}

/**
 * Descarga la foto del producto y la acomoda en width×height como JPEG sin perder el producto:
 * - si la proporción de la foto casi coincide con la de la caja (se perdería ≤10 %), se recorta apenas;
 * - si no, la foto completa va centrada (contain) sobre una copia suya desenfocada que rellena el
 *   resto, con los bordes difuminados para que no se note el corte.
 * También convierte cualquier formato (hay productos en WebP, que el renderizador no lee) y baja
 * las fotos de varios MB.
 */
export async function loadProductPhoto(url: string, width: number, height: number): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar la foto del producto (${response.status}).`);
  const input = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate() // respeta la orientación EXIF de las fotos tomadas con el celular
    .toBuffer();
  const w = Math.round(width);
  const h = Math.round(height);

  const meta = await sharp(input).metadata();
  const imgRatio = (meta.width ?? 1) / (meta.height ?? 1);
  const boxRatio = w / h;
  const lost = 1 - Math.min(imgRatio / boxRatio, boxRatio / imgRatio);

  if (lost <= 0.1) {
    const output = await sharp(input).resize(w, h, { fit: 'cover', position: 'attention' }).jpeg({ quality: 88 }).toBuffer();
    return `data:image/jpeg;base64,${output.toString('base64')}`;
  }

  const backdrop = await sharp(input).resize(w, h, { fit: 'cover' }).blur(34).modulate({ brightness: 0.95 }).toBuffer();
  const fgRaw = await sharp(input).resize(w, h, { fit: 'inside' }).toBuffer();
  const fgMeta = await sharp(fgRaw).metadata();
  const fw = fgMeta.width ?? w;
  const fh = fgMeta.height ?? h;

  // Difumina sólo los lados donde la foto no llega al borde de la caja.
  let foreground = sharp(fgRaw).ensureAlpha();
  if (fw < w - 2) foreground = sharp(await foreground.composite([{ input: featherMask(fw, fh, 44, 0, true), blend: 'dest-in' }]).png().toBuffer());
  if (fh < h - 2) foreground = sharp(await foreground.composite([{ input: featherMask(fw, fh, 0, 44, false), blend: 'dest-in' }]).png().toBuffer());

  const output = await sharp(backdrop)
    .composite([{ input: await foreground.png().toBuffer(), gravity: 'centre' }])
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${output.toString('base64')}`;
}

/**
 * Foto entera con su proporción original, sin recortar ni rellenar: se achica (o agranda) hasta
 * caber en maxW×maxH y se devuelven sus medidas reales para que la plantilla la dibuje igual.
 */
export async function loadProductPhotoNatural(url: string, maxW: number, maxH: number): Promise<{ src: string; w: number; h: number }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar la foto del producto (${response.status}).`);
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate()
    .resize(Math.round(maxW), Math.round(maxH), { fit: 'inside' })
    .jpeg({ quality: 90 })
    .toBuffer({ resolveWithObject: true });
  return { src: `data:image/jpeg;base64,${data.toString('base64')}`, w: info.width, h: info.height };
}
