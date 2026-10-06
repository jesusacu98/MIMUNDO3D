import { ImageResponse } from 'next/og';
import type { ReactElement } from 'react';
import type { AdFormat, AdOptions, AdProduct, AdStyle, AdTypeId } from './config';
import { loadFonts, loadLogo, loadProductPhoto } from './assets';
import { closingSlide, coverLayout, coverSlide, singleLayout, singleSlide } from './templates';

export interface RenderAdInput {
  style: AdStyle;
  format: AdFormat;
  type: AdTypeId;
  products: AdProduct[];
  options: AdOptions;
  /** Texto descriptivo que se imprime en la primera lámina (vacío = sin texto). */
  imageText?: string;
}

async function toPng(element: ReactElement, format: AdFormat): Promise<Buffer> {
  const fonts = await loadFonts();
  const response = new ImageResponse(element, { width: format.width, height: format.height, fonts });
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Renderiza las láminas del anuncio (PNG) con la foto real de cada producto: un anuncio de una
 * lámina para destacado/oferta/novedad, o portada + una por producto + cierre para el carrusel.
 * Nunca se le pide a una IA que redibuje el producto: la foto se usa tal cual (recortada).
 */
export async function renderAd({ style, format, type, products, options, imageText }: RenderAdInput): Promise<Buffer[]> {
  const logo = await loadLogo();

  if (type !== 'coleccion') {
    const product = products[0];
    const { inner } = singleLayout(style, format);
    const photoSrc = await loadProductPhoto(product.imageUrl, inner.w, inner.h);
    return [await toPng(singleSlide({ style, format, type, product, options, photoSrc, logo, imageText }), format)];
  }

  const total = products.length;
  const slideCount = total + 2;
  const { inner: coverInner, cells } = (({ cells, layout }) => ({ cells, inner: layout.inner }))(coverLayout(style, format, total));
  const { inner } = singleLayout(style, format);

  const [coverPhotos, productPhotos] = await Promise.all([
    Promise.all(products.slice(0, cells).map((p) => loadProductPhoto(p.imageUrl, coverInner.w, coverInner.h))),
    Promise.all(products.map((p) => loadProductPhoto(p.imageUrl, inner.w, inner.h))),
  ]);

  const title = options.title?.trim() || 'Nuestros favoritos';
  const slides: ReactElement[] = [
    coverSlide({ style, format, title, total, photos: coverPhotos, logo, imageText }),
    ...products.map((product, i) =>
      singleSlide({ style, format, type: 'carrusel', product, options, photoSrc: productPhotos[i], logo, counter: `${i + 2}/${slideCount}` }),
    ),
    closingSlide({ style, format, logo, counter: `${slideCount}/${slideCount}` }),
  ];

  const out: Buffer[] = [];
  for (const slide of slides) out.push(await toPng(slide, format));
  return out;
}
