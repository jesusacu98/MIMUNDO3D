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

/**
 * Descarga la foto del producto y la acomoda en width×height como JPEG SIN recortarla: la foto
 * completa va centrada (contain) sobre una copia suya desenfocada que rellena el resto. Así se ve
 * el producto entero aunque su proporción no sea la de la caja. También convierte cualquier
 * formato (hay productos en WebP, que el renderizador no lee) y baja las fotos de varios MB.
 */
export async function loadProductPhoto(url: string, width: number, height: number): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar la foto del producto (${response.status}).`);
  const input = await sharp(Buffer.from(await response.arrayBuffer()))
    .rotate() // respeta la orientación EXIF de las fotos tomadas con el celular
    .toBuffer();
  const w = Math.round(width);
  const h = Math.round(height);

  const backdrop = await sharp(input).resize(w, h, { fit: 'cover' }).blur(28).modulate({ brightness: 0.95 }).toBuffer();
  const foreground = await sharp(input).resize(w, h, { fit: 'inside', withoutEnlargement: false }).toBuffer();
  const output = await sharp(backdrop)
    .composite([{ input: foreground, gravity: 'centre' }])
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${output.toString('base64')}`;
}
