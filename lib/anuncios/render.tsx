import { ImageResponse } from 'next/og';
import type { ReactElement } from 'react';
import type { AdFormat, AdOptions, AdProduct, AdStyle, AdTypeId } from './config';
import { loadFonts, loadLogo, loadProductPhoto, loadProductPhotoNatural } from './assets';
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
    if (style.naturalPhoto) {
      const photo = await loadProductPhotoNatural(product.imageUrl, inner.w, inner.h);
      return [await toPng(singleSlide({ style, format, type, product, options, photoSrc: photo.src, photoDims: { w: photo.w, h: photo.h }, logo, imageText }), format)];
    }
    const photoSrc = await loadProductPhoto(product.imageUrl, inner.w, inner.h);
    return [await toPng(singleSlide({ style, format, type, product, options, photoSrc, logo, imageText }), format)];
  }

  const total = products.length;
  const slideCount = total + 2;
  const { cells, cards } = coverLayout(style, format, total);
  const { inner } = singleLayout(style, format);

  // Estilos con foto «natural»: cada foto va entera y con sus medidas reales (sin recorte ni relleno).
  const load = async (url: string, box: { w: number; h: number }) => {
    if (style.naturalPhoto) return loadProductPhotoNatural(url, box.w, box.h);
    return { src: await loadProductPhoto(url, box.w, box.h), w: box.w, h: box.h };
  };
  const [coverLoaded, productLoaded] = await Promise.all([
    Promise.all(products.slice(0, cells).map((p, i) => load(p.imageUrl, cards[i].inner))),
    Promise.all(products.map((p) => load(p.imageUrl, inner))),
  ]);
  const coverPhotos = coverLoaded.map((p) => p.src);
  const coverDims = coverLoaded.map((p) => ({ w: p.w, h: p.h }));

  const title = options.title?.trim() || 'Nuestros favoritos';
  const slides: ReactElement[] = [
    coverSlide({ style, format, title, total, photos: coverPhotos, photoDims: style.naturalPhoto ? coverDims : undefined, logo, imageText }),
    ...products.map((product, i) =>
      singleSlide({ style, format, type: 'carrusel', product, options, photoSrc: productLoaded[i].src, photoDims: style.naturalPhoto ? { w: productLoaded[i].w, h: productLoaded[i].h } : undefined, logo, counter: `${i + 2}/${slideCount}` }),
    ),
    closingSlide({ style, format, logo, counter: `${slideCount}/${slideCount}` }),
  ];

  const out: Buffer[] = [];
  for (const slide of slides) out.push(await toPng(slide, format));
  return out;
}
