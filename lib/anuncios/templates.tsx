/* eslint-disable @next/next/no-img-element -- Satori (ImageResponse) necesita <img> simples, no next/image */
import type { ReactElement } from 'react';
import { BRAND, type AdFormat, type AdOptions, type AdProduct, type AdStyle, type AdTypeId } from './config';
import { LOGO_RATIO } from './assets';

// Plantillas de las láminas del anuncio. Se renderizan con `ImageResponse` (Satori): sólo flexbox
// y un subconjunto de CSS, todo `div` con más de un hijo necesita `display: 'flex'`, y los helpers
// se llaman como funciones (no como componentes) para no depender del manejo de componentes de
// Satori. Los colores y fuentes salen de `AdStyle`: las plantillas no tienen colores fijos.

interface Frame {
  W: number;
  H: number;
  padX: number;
  padTop: number;
  padBottom: number;
  logoH: number;
  gap: number;
  /** Alto reservado para el bloque de texto (kicker, nombre, precio). */
  textH: number;
  headingSize: number;
}

function frameFor(format: AdFormat): Frame {
  switch (format.id) {
    case 'historia':
      // Las historias y Reels tapan ~250px arriba y abajo con la interfaz de la app: zona segura.
      return { W: format.width, H: format.height, padX: 72, padTop: 170, padBottom: 240, logoH: 64, gap: 32, textH: 540, headingSize: 92 };
    case 'cuadrado':
      return { W: format.width, H: format.height, padX: 56, padTop: 44, padBottom: 40, logoH: 46, gap: 22, textH: 330, headingSize: 58 };
    default:
      return { W: format.width, H: format.height, padX: 64, padTop: 56, padBottom: 52, logoH: 54, gap: 28, textH: 450, headingSize: 78 };
  }
}

export interface Box {
  w: number;
  h: number;
}

/** Medidas de la foto del producto: la caja exterior (con marco) y el recorte interior a pedir. */
export interface PhotoLayout {
  outer: Box;
  inner: Box;
}

function photoOuterBox(f: Frame, textH = f.textH): Box {
  return { w: f.W - 2 * f.padX, h: f.H - f.padTop - f.padBottom - f.logoH - textH - 2 * f.gap };
}

function photoLayoutFromBox(style: AdStyle, outer: Box): PhotoLayout {
  switch (style.photo) {
    case 'circle': {
      const d = Math.min(outer.w, outer.h);
      return { outer: { w: d, h: d }, inner: { w: d - 28, h: d - 28 } };
    }
    case 'square':
      return { outer, inner: outer };
    case 'polaroid': {
      const o = { w: outer.w - 70, h: outer.h - 40 };
      return { outer: o, inner: { w: o.w - 56, h: o.h - 56 - 96 } };
    }
    default:
      return { outer, inner: { w: outer.w - 28, h: outer.h - 28 } };
  }
}

/** Medidas de la foto en las láminas de un solo producto (destacado, oferta, novedad, carrusel). */
export function singleLayout(style: AdStyle, format: AdFormat): PhotoLayout {
  const f = frameFor(format);
  return photoLayoutFromBox(style, photoOuterBox(f));
}

/** Medidas de las celdas del collage de la portada del carrusel. */
export function coverLayout(style: AdStyle, format: AdFormat, count: number): { cells: number; layout: PhotoLayout } {
  const f = frameFor(format);
  const cells = Math.min(count, 4);
  const cols = cells >= 4 ? 2 : cells;
  const rows = cells >= 4 ? 2 : 1;
  const titleH = coverTitleH(format);
  const areaW = f.W - 2 * f.padX;
  const areaH = f.H - f.padTop - f.padBottom - f.logoH - titleH - 2 * f.gap;
  const gap = 20;
  const cellW = (areaW - gap * (cols - 1)) / cols;
  const cellH = (areaH - gap * (rows - 1)) / rows;
  const outer = { w: Math.floor(cellW), h: Math.floor(cellH) };
  // En el collage los marcos especiales (círculo, polaroid) estorban: se usa siempre la celda rectangular.
  return { cells, layout: { outer, inner: { w: outer.w - 20, h: outer.h - 20 } } };
}

function coverTitleH(format: AdFormat): number {
  return format.id === 'historia' ? 520 : format.id === 'cuadrado' ? 290 : 400;
}

function background(s: AdStyle): string {
  return s.bg === s.bg2 ? s.bg : `linear-gradient(145deg, ${s.bg} 0%, ${s.bg2} 100%)`;
}

function headingStyle(s: AdStyle, size: number) {
  return {
    fontFamily: s.heading,
    fontWeight: s.headingWeight,
    fontSize: size,
    lineHeight: 1.05,
    color: s.text,
    textTransform: s.uppercaseHeading ? ('uppercase' as const) : ('none' as const),
    letterSpacing: s.heading === 'Bangers' ? 2 : -0.5,
    textAlign: s.align,
  };
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean;
}

/** Achica el título cuando el nombre es largo, para que no se salga de la lámina. */
/**
 * Tamaño de letra para que un texto de cualquier largo quepa en width×maxH (estimación: ~0.68 del
 * tamaño por carácter, interlineado 1.25). El texto nunca se corta: si es largo, se achica la letra.
 */
function fitFontSize(text: string, width: number, maxH: number, maxSize: number, minSize = 18): number {
  const len = text.trim().length;
  for (let size = maxSize; size > minSize; size -= 2) {
    const lines = Math.ceil((len * size * 0.68) / width);
    if (lines * size * 1.25 <= maxH) return size;
  }
  return minSize;
}

function headingSizeFor(base: number, text: string, s: AdStyle): number {
  const scale = s.heading === 'Bangers' ? 1.28 : s.heading === 'DM Serif Display' ? 1.05 : 1;
  const size = base * scale;
  if (text.length > 34) return Math.round(size * 0.66);
  if (text.length > 22) return Math.round(size * 0.8);
  return Math.round(size);
}

function logoBlock(s: AdStyle, f: Frame, logo: string): ReactElement {
  const w = Math.round(f.logoH * LOGO_RATIO);
  const img = <img src={logo} width={w} height={f.logoH} alt="" />;
  if (!s.logoPill) return <div style={{ display: 'flex' }}>{img}</div>;
  return (
    <div style={{ display: 'flex', background: '#ffffff', borderRadius: 999, padding: '12px 26px' }}>
      <img src={logo} width={Math.round(w * 0.82)} height={Math.round(f.logoH * 0.82)} alt="" />
    </div>
  );
}

function headerRow(s: AdStyle, f: Frame, logo: string, right?: string): ReactElement {
  return (
    <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
      {logoBlock(s, f, logo)}
      {right ? (
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            fontWeight: 700,
            color: s.id === 'llamativo' || s.id === 'premium' ? s.text : s.muted,
            border: `2px solid ${s.muted}`,
            borderRadius: 999,
            padding: '8px 22px',
          }}
        >
          {right}
        </div>
      ) : null}
    </div>
  );
}

function decorations(s: AdStyle, f: Frame): ReactElement[] {
  const out: ReactElement[] = [];
  if (s.id === 'llamativo') {
    out.push(
      <div key="d1" style={{ position: 'absolute', top: -160, right: -140, width: 480, height: 480, borderRadius: 999, background: s.accent, opacity: 0.35 }} />,
      <div key="d2" style={{ position: 'absolute', bottom: -200, left: -160, width: 520, height: 520, borderRadius: 999, background: '#ffffff', opacity: 0.16 }} />,
    );
  } else if (s.id === 'calido') {
    out.push(
      <div key="d1" style={{ position: 'absolute', top: -120, left: -120, width: 380, height: 380, borderRadius: 999, background: '#ffffff', opacity: 0.55 }} />,
      <div key="d2" style={{ position: 'absolute', bottom: -160, right: -120, width: 460, height: 460, borderRadius: 999, background: s.accent, opacity: 0.12 }} />,
    );
  } else if (s.id === 'profesional') {
    out.push(<div key="d1" style={{ position: 'absolute', top: 0, left: 0, width: f.W, height: 16, background: s.accent }} />);
  } else if (s.id === 'premium') {
    out.push(
      <div key="d1" style={{ position: 'absolute', top: 26, left: 26, right: 26, bottom: 26, border: `2px solid ${s.accent}`, borderRadius: 8, opacity: 0.7 }} />,
      <div key="d2" style={{ position: 'absolute', top: -200, right: -100, width: 600, height: 600, borderRadius: 999, background: s.accent, opacity: 0.1 }} />,
    );
  }
  return out;
}

function photoBlock(s: AdStyle, layout: PhotoLayout, src: string, badge?: ReactElement | null, caption?: string): ReactElement {
  const { outer, inner } = layout;
  const shadow = '0 18px 44px rgba(0,0,0,0.22)';
  // El recorte redondeado va en la propia <img>: Satori no recorta la imagen con `overflow: hidden` del contenedor.
  const radius = s.photo === 'circle' ? Math.round(inner.w / 2) : s.photo === 'rounded' ? 32 : 0;
  const img = <img src={src} width={inner.w} height={inner.h} style={{ objectFit: 'cover', borderRadius: radius }} alt="" />;
  let body: ReactElement;

  if (s.photo === 'circle') {
    body = (
      <div style={{ display: 'flex', width: outer.w, height: outer.h, borderRadius: 999, background: s.card, padding: 14, boxShadow: shadow }}>
        {img}
      </div>
    );
  } else if (s.photo === 'square') {
    body = <div style={{ display: 'flex', width: outer.w, height: outer.h, background: s.card }}>{img}</div>;
  } else if (s.photo === 'polaroid') {
    body = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: outer.w,
          height: outer.h,
          background: s.card,
          padding: '28px 28px 0 28px',
          boxShadow: shadow,
          marginTop: 30,
          transform: 'rotate(-2.5deg)',
        }}
      >
        <div style={{ display: 'flex', width: inner.w, height: inner.h }}>{img}</div>
        <div style={{ display: 'flex', height: 96, alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 700, color: s.muted }}>
          {caption ? clip(caption, 34) : 'hecho en 3D'}
        </div>
        <div
          style={{ position: 'absolute', top: -22, left: outer.w / 2 - 90, width: 180, height: 46, background: 'rgba(243,76,145,0.55)', transform: 'rotate(3deg)' }}
        />
      </div>
    );
  } else {
    body = (
      <div style={{ display: 'flex', width: outer.w, height: outer.h, background: s.card, padding: 14, borderRadius: 44, boxShadow: shadow }}>
        {img}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', position: 'relative', width: outer.w, height: outer.h }}>
      {body}
      {badge}
    </div>
  );
}

function pill(s: AdStyle, text: string, size: number): ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        background: s.accent,
        color: s.onAccent,
        fontWeight: 800,
        fontSize: size,
        padding: `${Math.round(size * 0.22)}px ${Math.round(size * 0.6)}px`,
        borderRadius: 999,
        ...(s.id === 'llamativo' ? { transform: 'rotate(-3deg)' } : {}),
      }}
    >
      {text}
    </div>
  );
}

function contactLine(s: AdStyle, size: number): ReactElement {
  return (
    <div style={{ display: 'flex', fontSize: size, fontWeight: 500, color: s.muted }}>
      {`WhatsApp ${BRAND.whatsappDisplay}  ·  ${BRAND.instagram}`}
    </div>
  );
}

export interface SingleSlideInput {
  style: AdStyle;
  format: AdFormat;
  type: Exclude<AdTypeId, 'coleccion'> | 'carrusel';
  product: AdProduct;
  options: AdOptions;
  photoSrc: string;
  logo: string;
  /** «2/6» en las láminas de un carrusel. */
  counter?: string;
  /** Texto descriptivo que va sobre la imagen (sólo en la primera lámina del anuncio). */
  imageText?: string;
}

/** Quita aclaraciones entre paréntesis del nombre («Display NFC (QR + datos…)») para que el título quepa completo. */
function shortName(name: string): string {
  const cut = name.replace(/\s*[([].*$/, '').trim();
  return clip(cut.length >= 8 ? cut : name, 60);
}

export function singleSlide(input: SingleSlideInput): ReactElement {
  const { style: s, format, type, product, options, photoSrc, logo, counter, imageText } = input;
  const f = frameFor(format);
  const layout = singleLayout(s, format);
  const center = s.align === 'center';
  const pct = Math.min(90, Math.max(1, Math.round(options.discountPercent ?? 15)));
  const name = shortName(product.name);
  const hSize = headingSizeFor(f.headingSize, name, s);
  const small = format.id === 'cuadrado';

  const kicker =
    type === 'oferta'
      ? `OFERTA${options.deadline ? '  ·  ' + clip(options.deadline, 28).toUpperCase() : ''}`
      : type === 'novedad'
        ? 'NUEVO EN EL CATÁLOGO'
        : product.category.toUpperCase();

  let badge: ReactElement | null = null;
  if (type === 'oferta') {
    const d = small ? 170 : 210;
    badge = (
      <div
        style={{
          position: 'absolute',
          top: -26,
          right: -14,
          width: d,
          height: d,
          borderRadius: 999,
          background: s.accent,
          color: s.onAccent,
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex',
          fontFamily: s.heading === 'DM Serif Display' ? 'Poppins' : s.heading,
          fontWeight: s.heading === 'Bangers' ? 400 : 800,
          fontSize: Math.round(d * 0.34),
          transform: 'rotate(10deg)',
          boxShadow: '0 10px 26px rgba(0,0,0,0.28)',
        }}
      >
        {`-${pct}%`}
      </div>
    );
  } else if (type === 'novedad') {
    badge = (
      <div
        style={{
          position: 'absolute',
          top: -22,
          left: -10,
          display: 'flex',
          background: s.accent,
          color: s.onAccent,
          fontWeight: 800,
          fontSize: small ? 34 : 44,
          padding: '10px 34px',
          borderRadius: 999,
          transform: 'rotate(-6deg)',
          boxShadow: '0 10px 26px rgba(0,0,0,0.28)',
        }}
      >
        ¡NUEVO!
      </div>
    );
  }

  const ctaRow = (
    <div style={{ display: 'flex', justifyContent: center ? 'center' : 'flex-start' }}>{pill(s, `Catálogo en ${BRAND.siteDisplay}`, small ? 30 : 38)}</div>
  );

  const descriptive = imageText?.trim() ? (
    <div
      style={{
        display: 'flex',
        fontSize: fitFontSize(imageText ?? '', f.W - 2 * f.padX, small ? 120 : format.id === 'historia' ? 210 : 170, small ? 34 : 36),
        fontWeight: 500,
        lineHeight: 1.25,
        color: s.muted,
        textAlign: s.align,
        maxWidth: f.W - 2 * f.padX,
      }}
    >
      {imageText.replace(/\s+/g, ' ').trim()}
    </div>
  ) : null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: f.W,
        height: f.H,
        background: background(s),
        fontFamily: 'Poppins',
        padding: `${f.padTop}px ${f.padX}px ${f.padBottom}px ${f.padX}px`,
        position: 'relative',
      }}
    >
      {decorations(s, f)}
      {headerRow(s, f, logo, counter)}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: f.gap }}>
        {photoBlock(s, layout, photoSrc, badge, product.category)}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: center ? 'center' : 'flex-start',
          justifyContent: 'center',
          marginTop: f.gap,
          height: f.textH,
          gap: small ? 8 : 14,
        }}
      >
        <div style={{ display: 'flex', fontSize: small ? 24 : 30, fontWeight: 800, letterSpacing: 3, color: s.accent }}>{kicker}</div>
        <div style={{ ...headingStyle(s, hSize), display: 'flex', maxWidth: f.W - 2 * f.padX }}>{name}</div>
        {descriptive}
        {ctaRow}
        {small ? null : contactLine(s, 28)}
      </div>
    </div>
  );
}

export interface CoverSlideInput {
  style: AdStyle;
  format: AdFormat;
  title: string;
  total: number;
  photos: string[];
  logo: string;
  /** Texto descriptivo bajo el título (lo que el cliente lee en la imagen). */
  imageText?: string;
}

export function coverSlide(input: CoverSlideInput): ReactElement {
  const { style: s, format, title, total, photos, logo, imageText } = input;
  const f = frameFor(format);
  const { layout } = coverLayout(s, format, photos.length);
  const cols = photos.length >= 4 ? 2 : photos.length;
  const center = s.align === 'center';
  const titleH = coverTitleH(format);
  const clean = clip(title, 70);
  const hSize = headingSizeFor(f.headingSize * 1.12, clean, s);
  const cardShape = { borderRadius: s.photo === 'square' ? 0 : 30 };
  // Minimalista: portada de aire «editorial» (título grande con la última palabra en rosa, filete,
  // subtítulo con barra y fotos numeradas) para que no se sienta vacía sin dejar de ser sobria.
  const editorial = s.id === 'minimalista';
  const textW = f.W - 2 * f.padX;
  const words = clean.split(' ');
  const lastWord = words.length > 1 ? words.pop()! : '';
  const oneLine = Math.floor(textW / (clean.length * 0.7));
  // En historia sobra alto: un título largo puede ir en dos líneas con letra más grande.
  const twoLines = format.id === 'historia' ? Math.floor(textW / (Math.ceil(clean.length / 2) * 0.72)) : 0;
  const editorialSize = Math.max(58, Math.min(112, Math.max(oneLine, twoLines)));
  const subtitle = imageText?.replace(/\s+/g, ' ').trim() ?? '';

  const rows: string[][] = [];
  for (let i = 0; i < photos.length; i += cols) rows.push(photos.slice(i, i + cols));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: f.W,
        height: f.H,
        background: background(s),
        fontFamily: 'Poppins',
        padding: `${f.padTop}px ${f.padX}px ${f.padBottom}px ${f.padX}px`,
        position: 'relative',
      }}
    >
      {decorations(s, f)}
      {headerRow(s, f, logo, `${total} productos`)}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: center && !editorial ? 'center' : 'flex-start',
          height: titleH,
          marginTop: f.gap,
          gap: 14,
        }}
      >
        {editorial ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', width: textW }}>
              <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, letterSpacing: 4, color: s.accent }}>COLECCIÓN</div>
              <div style={{ display: 'flex', width: textW - 290, height: 3, marginLeft: 24, background: '#f9c3da' }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', width: textW, fontWeight: 800, fontSize: editorialSize, lineHeight: 1.02, letterSpacing: -2, color: s.text }}>
              {words.map((w, i) => (
                <div key={i} style={{ display: 'flex', marginRight: Math.round(editorialSize * 0.24) }}>
                  {w}
                </div>
              ))}
              {lastWord ? <div style={{ display: 'flex', color: s.accent }}>{lastWord}</div> : null}
            </div>
            {subtitle ? (
              <div style={{ display: 'flex', width: textW }}>
                <div style={{ display: 'flex', width: 7, background: s.accent, borderRadius: 4 }} />
                <div
                  style={{
                    display: 'flex',
                    marginLeft: 22,
                    flex: 1,
                    fontSize: fitFontSize(subtitle, textW - 30, format.id === 'historia' ? 200 : format.id === 'cuadrado' ? 80 : 110, format.id === 'cuadrado' ? 28 : 34),
                    fontWeight: 500,
                    lineHeight: 1.25,
                    color: s.muted,
                  }}
                >
                  {subtitle}
                </div>
              </div>
            ) : null}
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: 1, color: s.text }}>Desliza para verlos  →</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: center ? 'center' : 'flex-start', gap: 14 }}>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 800, letterSpacing: 3, color: s.accent }}>COLECCIÓN</div>
          <div style={{ ...headingStyle(s, hSize), display: 'flex', maxWidth: f.W - 2 * f.padX }}>{clean}</div>
          {imageText?.trim() ? (
            <div style={{ display: 'flex', fontSize: fitFontSize(imageText, f.W - 2 * f.padX, format.id === 'historia' ? 230 : format.id === 'cuadrado' ? 100 : 150, format.id === 'cuadrado' ? 28 : 34), fontWeight: 500, lineHeight: 1.25, color: s.muted, textAlign: s.align, maxWidth: f.W - 2 * f.padX }}>
              {imageText.replace(/\s+/g, ' ').trim()}
            </div>
          ) : null}
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: s.accent }}>Desliza para verlos  →</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: f.gap }}>
        {rows.map((row, r) => (
          <div key={r} style={{ display: 'flex', gap: 20 }}>
            {row.map((src, c) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  width: layout.outer.w,
                  height: layout.outer.h,
                  background: s.card,
                  padding: 10,
                  ...(editorial ? {} : { boxShadow: '0 12px 30px rgba(0,0,0,0.2)' }),
                  position: 'relative',
                  ...cardShape,
                }}
              >
                <img src={src} width={layout.inner.w} height={layout.inner.h} style={{ objectFit: 'cover', borderRadius: cardShape.borderRadius ? 22 : 0 }} alt="" />
                {editorial ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 22,
                      bottom: 22,
                      display: 'flex',
                      background: s.accent,
                      color: s.onAccent,
                      fontSize: 24,
                      fontWeight: 800,
                      letterSpacing: 1,
                      padding: '4px 16px',
                      borderRadius: 999,
                    }}
                  >
                    {String(r * cols + c + 1).padStart(2, '0')}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface ClosingSlideInput {
  style: AdStyle;
  format: AdFormat;
  logo: string;
  counter?: string;
}

export function closingSlide(input: ClosingSlideInput): ReactElement {
  const { style: s, format, logo, counter } = input;
  const f = frameFor(format);
  const big = format.id === 'historia' ? 1.25 : format.id === 'cuadrado' ? 0.85 : 1;
  const logoW = Math.round(f.logoH * LOGO_RATIO * 1.9);
  const logoH = Math.round(f.logoH * 1.9);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: f.W,
        height: f.H,
        background: background(s),
        fontFamily: 'Poppins',
        padding: `${f.padTop}px ${f.padX}px ${f.padBottom}px ${f.padX}px`,
        position: 'relative',
      }}
    >
      {decorations(s, f)}
      {counter ? (
        <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', fontSize: 26, fontWeight: 700, color: s.muted }}>{counter}</div>
      ) : (
        <div style={{ display: 'flex', height: 34 }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 * big, textAlign: 'center' }}>
        <div style={{ display: 'flex', background: '#ffffff', borderRadius: 999, padding: '22px 48px', boxShadow: '0 14px 34px rgba(0,0,0,0.2)' }}>
          <img src={logo} width={Math.round(logoW * 0.85)} height={Math.round(logoH * 0.85)} alt="" />
        </div>
        <div style={{ ...headingStyle(s, Math.round(104 * big * (s.heading === 'Bangers' ? 1.25 : 1))), display: 'flex', textAlign: 'center', justifyContent: 'center' }}>
          ¿Te gustó algo?
        </div>
        <div style={{ display: 'flex', fontSize: Math.round(40 * big), fontWeight: 500, color: s.muted, maxWidth: 820, justifyContent: 'center' }}>
          Escríbenos y lo hacemos a tu medida
        </div>
        {pill(s, `WhatsApp ${BRAND.whatsappDisplay}`, Math.round(52 * big))}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: Math.round(10 * big) }}>
          {[
            ['Instagram', BRAND.instagram],
            ['Facebook', BRAND.facebook],
            ['Catálogo', BRAND.siteDisplay],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: Math.round(34 * big), color: s.text }}>
              <div style={{ display: 'flex', fontWeight: 500, color: s.muted }}>{label}</div>
              <div style={{ display: 'flex', fontWeight: 800 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
