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

/** Geometría de la lámina de un solo producto: cada estilo compone distinto y la foto ocupa gran parte del lienzo. */
interface SingleGeom {
  /** Posición y medidas (px) de la imagen del producto. */
  x: number;
  y: number;
  photo: Box;
  /** Sólo polaroid: caja exterior de la tarjeta blanca. */
  outer?: Box;
  /** Dónde empieza el bloque de texto. */
  textTop: number;
}

function singleGeom(s: AdStyle, format: AdFormat): SingleGeom {
  const f = frameFor(format);
  const textTop = f.H - f.padBottom - f.textH;
  const historia = format.id === 'historia';
  switch (s.id) {
    case 'llamativo': {
      // Foto entera (sin recortar) en marco blanco: caja máxima donde se acomoda según su proporción.
      const y = f.padTop + f.logoH + 34;
      return { x: 0, y, photo: { w: f.W - 2 * f.padX - 56, h: textTop - 30 - y - 32 }, textTop };
    }
    case 'profesional':
      return { x: 0, y: 0, photo: { w: f.W, h: textTop + 20 }, textTop };
    case 'premium':
      return { x: 0, y: 0, photo: { w: f.W, h: f.H }, textTop };
    case 'minimalista': {
      const y = historia ? 90 : 40;
      const w = f.W - 100;
      return { x: (f.W - w) / 2 - 14, y, photo: { w, h: textTop + 70 - y }, textTop };
    }
    case 'calido': {
      const y = f.padTop + f.logoH + 24;
      const w = f.W - 200;
      return { x: (f.W - w) / 2, y, photo: { w, h: textTop - 40 - y }, textTop };
    }
    default: {
      // crudo: polaroid grande y ladeada
      const y = f.padTop + f.logoH + 34;
      const ow = f.W - 90;
      const oh = textTop - 14 - y;
      return { x: (f.W - ow) / 2, y, photo: { w: ow - 60, h: oh - 28 - 100 }, outer: { w: ow, h: oh }, textTop };
    }
  }
}

/** Medidas de la foto en las láminas de un solo producto (destacado, oferta, novedad, carrusel). */
export function singleLayout(style: AdStyle, format: AdFormat): PhotoLayout {
  const g = singleGeom(style, format);
  return { outer: g.outer ?? g.photo, inner: g.photo };
}

/** Tarjetas ladeadas y encimadas del collage de la portada (posiciones como fracción del área). */
const COVER_CARDS: Record<number, { x: number; y: number; w: number; h: number; r: number }[]> = {
  2: [
    { x: 0, y: 0, w: 0.72, h: 0.6, r: -4 },
    { x: 0.28, y: 0.4, w: 0.72, h: 0.6, r: 3.5 },
  ],
  3: [
    { x: 0, y: 0, w: 0.6, h: 0.54, r: -4 },
    { x: 0.4, y: 0.14, w: 0.6, h: 0.52, r: 3 },
    { x: 0.14, y: 0.5, w: 0.66, h: 0.5, r: -2 },
  ],
  4: [
    { x: 0, y: 0, w: 0.56, h: 0.53, r: -4 },
    { x: 0.44, y: 0.04, w: 0.56, h: 0.53, r: 3.5 },
    { x: 0, y: 0.47, w: 0.56, h: 0.53, r: 3 },
    { x: 0.44, y: 0.5, w: 0.56, h: 0.5, r: -3 },
  ],
};

/** Medidas del collage de la portada: área disponible y, por tarjeta, su caja y la foto que lleva dentro. */
export function coverLayout(style: AdStyle, format: AdFormat, count: number) {
  void style;
  const f = frameFor(format);
  const cells = Math.min(Math.max(count, 2), 4);
  const area = {
    x: f.padX - 14,
    y: f.padTop + f.logoH + f.gap + coverTitleH(format) - 10,
    w: f.W - 2 * f.padX + 28,
    h: 0,
  };
  area.h = f.H - f.padBottom + 10 - area.y;
  const cards = COVER_CARDS[cells].map((c) => {
    const w = Math.round(c.w * area.w);
    const h = Math.round(c.h * area.h);
    return { left: Math.round(area.x + c.x * area.w), top: Math.round(area.y + c.y * area.h), w, h, r: c.r, inner: { w: w - 26, h: h - 26 } };
  });
  return { cells: Math.min(count, 4), area, cards };
}

function coverTitleH(format: AdFormat): number {
  return format.id === 'historia' ? 470 : format.id === 'cuadrado' ? 260 : 360;
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
  /** Medidas reales de la foto cuando el estilo la muestra entera (`naturalPhoto`). */
  photoDims?: Box;
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
  const { style: s, format, type, product, options, photoSrc, photoDims, logo, counter, imageText } = input;
  const f = frameFor(format);
  const g = singleGeom(s, format);
  const center = s.align === 'center';
  const pct = Math.min(90, Math.max(1, Math.round(options.discountPercent ?? 15)));
  const name = shortName(product.name);
  const hSize = headingSizeFor(f.headingSize, name, s);
  const small = format.id === 'cuadrado';
  const historia = format.id === 'historia';
  const { x, y, photo } = g;

  const kicker =
    type === 'oferta'
      ? `OFERTA${options.deadline ? '  ·  ' + clip(options.deadline, 28).toUpperCase() : ''}`
      : type === 'novedad'
        ? 'NUEVO EN EL CATÁLOGO'
        : product.category.toUpperCase();

  // ---- Piezas comunes -------------------------------------------------------------------------
  // Logo y contador flotan sobre la foto (chips blancos para que se lean sobre cualquier imagen).
  const overPhoto = s.id === 'llamativo' || s.id === 'profesional' || s.id === 'premium' || s.id === 'minimalista';
  const logoW = Math.round(f.logoH * LOGO_RATIO * (overPhoto ? 0.82 : 1));
  const logoHt = Math.round(f.logoH * (overPhoto ? 0.82 : 1));
  const header = (
    <div
      style={{
        position: 'absolute',
        top: f.padTop,
        left: f.padX,
        width: f.W - 2 * f.padX,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {overPhoto ? (
        <div style={{ display: 'flex', background: '#ffffff', borderRadius: 999, padding: '12px 26px', boxShadow: '0 8px 22px rgba(0,0,0,0.25)' }}>
          <img src={logo} width={logoW} height={logoHt} alt="" />
        </div>
      ) : (
        <div style={{ display: 'flex' }}>
          <img src={logo} width={logoW} height={logoHt} alt="" />
        </div>
      )}
      {counter ? (
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            fontWeight: 700,
            color: overPhoto ? '#18181b' : s.muted,
            background: overPhoto ? 'rgba(255,255,255,0.92)' : 'transparent',
            border: overPhoto ? 'none' : `2px solid ${s.muted}`,
            borderRadius: 999,
            padding: '8px 22px',
          }}
        >
          {counter}
        </div>
      ) : null}
    </div>
  );

  const badgeTop = f.padTop + f.logoH + (historia ? 50 : 34);
  let badge: ReactElement | null = null;
  if (type === 'oferta') {
    const d = small ? 190 : historia ? 270 : 240;
    badge = (
      <div
        style={{
          position: 'absolute',
          top: badgeTop,
          right: 40,
          width: d,
          height: d,
          borderRadius: 999,
          background: s.accent,
          color: s.onAccent,
          alignItems: 'center',
          justifyContent: 'center',
          display: 'flex',
          border: '6px solid #ffffff',
          fontFamily: s.heading === 'DM Serif Display' ? 'Poppins' : s.heading,
          fontWeight: s.heading === 'Bangers' ? 400 : 800,
          fontSize: Math.round(d * 0.34),
          transform: 'rotate(10deg)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
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
          top: badgeTop,
          left: 36,
          display: 'flex',
          background: s.accent,
          color: s.onAccent,
          fontWeight: 800,
          fontSize: small ? 38 : historia ? 56 : 48,
          padding: '12px 40px',
          borderRadius: 999,
          border: '5px solid #ffffff',
          transform: 'rotate(-7deg)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
        }}
      >
        ¡NUEVO!
      </div>
    );
  }

  const tw = s.id === 'minimalista' ? f.W - 120 - 80 : f.W - 2 * f.padX;
  const descriptive = imageText?.trim() ? (
    <div
      style={{
        display: 'flex',
        fontSize: fitFontSize(imageText ?? '', tw, small ? 110 : historia ? 200 : 160, small ? 32 : 36),
        fontWeight: 500,
        lineHeight: 1.25,
        color: s.muted,
        textAlign: s.align,
        maxWidth: tw,
      }}
    >
      {imageText.replace(/\s+/g, ' ').trim()}
    </div>
  ) : null;

  const textStack = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: center ? 'center' : 'flex-start',
        justifyContent: 'center',
        height: f.textH,
        gap: small ? 8 : 14,
      }}
    >
      <div style={{ display: 'flex', fontSize: small ? 24 : 30, fontWeight: 800, letterSpacing: 3, color: s.accent }}>{kicker}</div>
      <div style={{ ...headingStyle(s, hSize), display: 'flex', maxWidth: tw }}>{name}</div>
      {descriptive}
      <div style={{ display: 'flex', justifyContent: center ? 'center' : 'flex-start' }}>{pill(s, `Catálogo en ${BRAND.siteDisplay}`, small ? 30 : 38)}</div>
      {small ? null : contactLine(s, 28)}
    </div>
  );

  const textBox = (
    <div style={{ position: 'absolute', left: f.padX, top: g.textTop, width: f.W - 2 * f.padX, height: f.textH, display: 'flex' }}>{textStack}</div>
  );

  const img = (w: number, h: number, extra: Record<string, number | string> = {}) => (
    <img src={photoSrc} width={w} height={h} style={{ objectFit: 'cover', ...extra }} alt="" />
  );

  const rootStyle = {
    display: 'flex',
    width: f.W,
    height: f.H,
    background: background(s),
    fontFamily: 'Poppins',
    position: 'relative' as const,
  };

  // ---- Composición por estilo -----------------------------------------------------------------
  if (s.id === 'llamativo') {
    // Sin degradados: fondo rosa liso, la foto ENTERA en marco blanco ladeado sobre un bloque amarillo.
    const dims = photoDims ?? photo;
    const frameW = dims.w + 32;
    const frameH = dims.h + 32;
    const left = (f.W - frameW) / 2;
    const top = y + (photo.h + 32 - frameH) / 2;
    return (
      <div style={rootStyle}>
        {decorations(s, f)}
        <div style={{ position: 'absolute', left: left + 30, top: top + 30, width: frameW, height: frameH, background: s.accent, transform: 'rotate(4deg)' }} />
        <div
          style={{
            position: 'absolute',
            left,
            top,
            width: frameW,
            height: frameH,
            background: '#ffffff',
            padding: 16,
            display: 'flex',
            boxShadow: '0 20px 44px rgba(0,0,0,0.3)',
            transform: 'rotate(-2deg)',
          }}
        >
          <img src={photoSrc} width={dims.w} height={dims.h} alt="" />
        </div>
        {header}
        {badge}
        {textBox}
      </div>
    );
  }

  if (s.id === 'profesional') {
    // Foto a sangre arriba y un panel blanco con esquinas redondas que la monta por debajo.
    return (
      <div style={rootStyle}>
        <div style={{ position: 'absolute', left: x, top: y, display: 'flex' }}>{img(photo.w, photo.h)}</div>
        <div style={{ position: 'absolute', top: 0, left: 0, width: f.W, height: 16, background: s.accent }} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: g.textTop - 48,
            width: f.W,
            height: f.H - (g.textTop - 48),
            background: '#ffffff',
            borderTopLeftRadius: 60,
            borderTopRightRadius: 60,
            boxShadow: '0 -16px 44px rgba(15,23,42,0.22)',
          }}
        />
        <div style={{ position: 'absolute', left: f.padX, top: g.textTop - 48 - 6, width: 150, height: 12, background: s.accent, borderRadius: 6 }} />
        {header}
        {badge}
        {textBox}
      </div>
    );
  }

  if (s.id === 'premium') {
    // Foto a lienzo completo, degradado negro desde abajo y marco fino.
    return (
      <div style={rootStyle}>
        <div style={{ position: 'absolute', left: 0, top: 0, display: 'flex' }}>{img(photo.w, photo.h)}</div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: f.H * 0.34,
            width: f.W,
            height: f.H * 0.66,
            backgroundImage: 'linear-gradient(to top, rgba(12,10,15,0.97) 0%, rgba(12,10,15,0.9) 42%, rgba(12,10,15,0) 100%)',
          }}
        />
        <div style={{ position: 'absolute', left: 0, top: 0, width: f.W, height: 280, backgroundImage: 'linear-gradient(to bottom, rgba(12,10,15,0.65), rgba(12,10,15,0))' }} />
        <div style={{ position: 'absolute', top: 26, left: 26, right: 26, bottom: 26, border: `2px solid ${s.accent}`, borderRadius: 8, opacity: 0.75 }} />
        {header}
        {badge}
        {textBox}
      </div>
    );
  }

  if (s.id === 'minimalista') {
    // Foto grande con un bloque rosa desplazado detrás y una tarjeta blanca de texto que la monta.
    return (
      <div style={rootStyle}>
        <div style={{ position: 'absolute', left: x + 30, top: y + 30, width: photo.w, height: photo.h, background: s.accent }} />
        <div style={{ position: 'absolute', left: x, top: y, display: 'flex' }}>{img(photo.w, photo.h)}</div>
        <div
          style={{
            position: 'absolute',
            left: 48,
            top: g.textTop,
            width: f.W - 120,
            height: f.textH + 30,
            background: '#ffffff',
            padding: '0 40px',
            display: 'flex',
            boxShadow: '0 14px 40px rgba(0,0,0,0.14)',
          }}
        >
          {textStack}
        </div>
        {header}
        {badge}
      </div>
    );
  }

  if (s.id === 'calido') {
    // Foto en arco con un contorno que lo rodea, círculos suaves de fondo y texto centrado.
    const r = photo.w / 2;
    return (
      <div style={rootStyle}>
        {decorations(s, f)}
        <div
          style={{
            position: 'absolute',
            left: x - 22,
            top: y - 22,
            width: photo.w + 44,
            height: photo.h + 44,
            border: '6px solid rgba(243,76,145,0.4)',
            borderTopLeftRadius: r + 22,
            borderTopRightRadius: r + 22,
            borderBottomLeftRadius: 70,
            borderBottomRightRadius: 70,
          }}
        />
        <div style={{ position: 'absolute', left: x, top: y, display: 'flex' }}>
          {img(photo.w, photo.h, { borderTopLeftRadius: r, borderTopRightRadius: r, borderBottomLeftRadius: 50, borderBottomRightRadius: 50 })}
        </div>
        {header}
        {badge}
        {textBox}
      </div>
    );
  }

  // crudo: polaroid enorme ladeada sobre una cinta de papel rosa
  const outer = g.outer ?? { w: photo.w + 60, h: photo.h + 128 };
  return (
    <div style={rootStyle}>
      <div style={{ position: 'absolute', left: -60, top: y + outer.h * 0.38, width: f.W + 120, height: outer.h * 0.5, background: '#f7c6dc', transform: 'rotate(-5deg)' }} />
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: outer.w,
          height: outer.h,
          background: s.card,
          padding: '30px 30px 0 30px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 54px rgba(0,0,0,0.3)',
          transform: 'rotate(-2.5deg)',
        }}
      >
        <div style={{ display: 'flex', width: photo.w, height: photo.h }}>{img(photo.w, photo.h)}</div>
        <div style={{ display: 'flex', height: 98, alignItems: 'center', justifyContent: 'center', fontFamily: 'Bangers', fontSize: 46, letterSpacing: 2, color: s.muted }}>
          {clip(product.category || 'hecho en 3D', 30).toUpperCase()}
        </div>
        <div style={{ position: 'absolute', top: -26, left: outer.w / 2 - 100, width: 200, height: 54, background: 'rgba(243,76,145,0.6)', transform: 'rotate(3deg)' }} />
      </div>
      {header}
      {badge}
      {textBox}
    </div>
  );
}

export interface CoverSlideInput {
  style: AdStyle;
  format: AdFormat;
  title: string;
  total: number;
  photos: string[];
  /** Medidas reales de cada foto cuando el estilo la muestra entera (`naturalPhoto`). */
  photoDims?: Box[];
  logo: string;
  /** Texto descriptivo bajo el título (lo que el cliente lee en la imagen). */
  imageText?: string;
}

export function coverSlide(input: CoverSlideInput): ReactElement {
  const { style: s, format, title, total, photos, photoDims, logo, imageText } = input;
  const f = frameFor(format);
  const { cards } = coverLayout(s, format, photos.length);
  const center = s.align === 'center';
  const titleH = coverTitleH(format);
  const clean = clip(title, 70);
  const hSize = headingSizeFor(f.headingSize * 1.12, clean, s);
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
      {cards.slice(0, photos.length).map((card, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: card.left,
            top: card.top,
            width: card.w,
            height: card.h,
            display: 'flex',
            background: s.card,
            padding: 13,
            borderRadius: s.photo === 'square' ? 4 : 30,
            boxShadow: '0 18px 40px rgba(0,0,0,0.28)',
            transform: `rotate(${card.r}deg)`,
          }}
        >
          {photoDims ? (
            <div style={{ display: 'flex', width: card.inner.w, height: card.inner.h, alignItems: 'center', justifyContent: 'center' }}>
              <img src={photos[i]} width={photoDims[i].w} height={photoDims[i].h} alt="" />
            </div>
          ) : (
            <img src={photos[i]} width={card.inner.w} height={card.inner.h} style={{ objectFit: 'cover', borderRadius: s.photo === 'square' ? 2 : 20 }} alt="" />
          )}
          {editorial ? (
            <div
              style={{
                position: 'absolute',
                left: 26,
                bottom: 26,
                display: 'flex',
                background: s.accent,
                color: s.onAccent,
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: 1,
                padding: '4px 18px',
                borderRadius: 999,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>
          ) : null}
        </div>
      ))}
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
