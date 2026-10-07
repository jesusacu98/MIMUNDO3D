// Catálogo de estilos, tipos de anuncio y formatos del generador de anuncios (/admin/anuncios).
// Todo es dato: para sumar un estilo nuevo basta con agregar una entrada a AD_STYLES (y su id al
// tipo), las plantillas de lib/anuncios/templates.tsx leen estos valores y no tienen colores fijos.

export const BRAND = {
  pink: '#f34c91',
  pinkDark: '#d6397a',
  whatsapp: '526691224168',
  whatsappDisplay: '669 122 4168',
  instagram: '@mimundo3d.studio',
  facebook: 'MiMundo3D',
  /** Sitio donde están los catálogos; se muestra sin «https://www.» en los anuncios. */
  siteDisplay: 'mimundo3d.com.mx',
  siteUrl: 'https://www.mimundo3d.com.mx',
} as const;

export type AdStyleId = 'llamativo' | 'profesional' | 'minimalista' | 'calido' | 'crudo' | 'premium';
export type AdTypeId = 'destacado' | 'oferta' | 'novedad' | 'coleccion';
export type AdFormatId = 'feed' | 'cuadrado' | 'historia';

export type FontKey = 'Poppins' | 'Bangers' | 'DM Serif Display';

export interface AdStyle {
  id: AdStyleId;
  label: string;
  description: string;
  /** Guía de tono para el texto (la usa el modelo de lenguaje). */
  tone: string;
  bg: string;
  /** Segundo color del fondo; si es distinto de `bg` se pinta un degradado diagonal. */
  bg2: string;
  text: string;
  muted: string;
  accent: string;
  /** Texto sobre el color de acento (insignias, botón de precio). */
  onAccent: string;
  /** Color de la tarjeta/marco de la foto. */
  card: string;
  heading: FontKey;
  headingWeight: 400 | 700 | 800;
  /** Forma de la foto del producto. */
  photo: 'rounded' | 'circle' | 'square' | 'polaroid';
  /** El logo rosa no se ve sobre fondos oscuros/rosas: va dentro de una pastilla blanca. */
  logoPill: boolean;
  /** La foto se muestra entera y con su proporción original (sin recortar ni rellenar con desenfoque). */
  naturalPhoto?: boolean;
  uppercaseHeading: boolean;
  align: 'left' | 'center';
}

export const AD_STYLES: AdStyle[] = [
  {
    id: 'llamativo',
    label: 'Llamativo',
    description: 'Fondo rosa liso (sin degradados), colores fuertes, letras grandes y la foto completa en marco blanco. Para ofertas y novedades que deben notarse.',
    tone: 'enérgico, divertido y emocionado; frases cortas, signos de exclamación y emojis (3 a 5)',
    bg: BRAND.pink,
    bg2: BRAND.pink,
    text: '#ffffff',
    muted: '#ffe4ee',
    accent: '#ffe14d',
    onAccent: '#3a1026',
    card: '#ffffff',
    heading: 'Bangers',
    headingWeight: 400,
    photo: 'rounded',
    logoPill: true,
    naturalPhoto: true,
    uppercaseHeading: true,
    align: 'left',
  },
  {
    id: 'profesional',
    label: 'Profesional',
    description: 'Limpio y ordenado, tipografía firme y tarjeta blanca. Para negocios, placas, soportes y piezas útiles.',
    tone: 'serio, claro y confiable; habla de calidad, personalización y utilidad; emojis sobrios y de negocio (✅ 📦 🛠️ 🤝 📲), sin exceso',
    bg: '#eef2f7',
    bg2: '#eef2f7',
    text: '#0f172a',
    muted: '#475569',
    accent: BRAND.pink,
    onAccent: '#ffffff',
    card: '#ffffff',
    heading: 'Poppins',
    headingWeight: 800,
    photo: 'rounded',
    logoPill: false,
    uppercaseHeading: false,
    align: 'left',
  },
  {
    id: 'minimalista',
    label: 'Minimalista',
    description: 'Mucho aire, la pieza como protagonista y un solo toque de color. Imagen de marca y catálogo.',
    tone: 'sobrio y elegante, pocas palabras, sin exclamaciones; pocos emojis pero siempre presentes y discretos (✨ 🤍 ▫️)',
    bg: '#ffffff',
    bg2: '#ffffff',
    text: '#18181b',
    muted: '#71717a',
    accent: BRAND.pink,
    onAccent: '#ffffff',
    card: '#f4f4f5',
    heading: 'Poppins',
    headingWeight: 700,
    photo: 'square',
    logoPill: false,
    uppercaseHeading: false,
    align: 'center',
  },
  {
    id: 'calido',
    label: 'Cálido / regalo',
    description: 'Tonos suaves y letra con serifa. Pensado para regalos, fechas especiales y detalles personalizados.',
    tone: 'cercano, afectuoso y emotivo; piensa en regalar y en quien lo recibe; 2 o 3 emojis tiernos',
    bg: '#fff1f6',
    bg2: '#ffe0ec',
    text: '#6b1d42',
    muted: '#a0527a',
    accent: BRAND.pinkDark,
    onAccent: '#ffffff',
    card: '#ffffff',
    heading: 'DM Serif Display',
    headingWeight: 400,
    photo: 'circle',
    logoPill: false,
    uppercaseHeading: false,
    align: 'center',
  },
  {
    id: 'crudo',
    label: 'Crudo / hecho a mano',
    description: 'Estilo foto casera, tipo polaroid sobre papel. Funciona muy bien en redes porque se siente auténtico.',
    tone: 'natural y de conversación, como contándole a un amigo cómo se hizo; primera persona del plural; 1 o 2 emojis',
    bg: '#ece5da',
    bg2: '#ece5da',
    text: '#2b2118',
    muted: '#6f6254',
    accent: BRAND.pink,
    onAccent: '#ffffff',
    card: '#ffffff',
    heading: 'Poppins',
    headingWeight: 800,
    photo: 'polaroid',
    logoPill: false,
    uppercaseHeading: false,
    align: 'left',
  },
  {
    id: 'premium',
    label: 'Oscuro / premium',
    description: 'Fondo negro con acento rosa y serifa elegante. Para piezas de colección o de mayor valor.',
    tone: 'exclusivo y aspiracional, seguro de sí mismo; destaca el detalle y el acabado; sin exclamaciones; emojis elegantes y discretos (✨ 🖤 💎 🔥)',
    bg: '#0c0a0f',
    bg2: '#1c1220',
    text: '#ffffff',
    muted: '#c9b8cf',
    accent: BRAND.pink,
    onAccent: '#ffffff',
    card: '#1f1824',
    heading: 'DM Serif Display',
    headingWeight: 400,
    photo: 'rounded',
    logoPill: true,
    uppercaseHeading: false,
    align: 'left',
  },
];

export interface AdType {
  id: AdTypeId;
  label: string;
  description: string;
  /** Cuántos productos acepta (min/max). */
  minProducts: number;
  maxProducts: number;
}

export const AD_TYPES: AdType[] = [
  { id: 'destacado', label: 'Producto destacado', description: 'Un producto con su nombre, precio y llamado a la acción.', minProducts: 1, maxProducts: 1 },
  { id: 'oferta', label: 'Oferta / promoción', description: 'Precio anterior tachado, % de descuento y vigencia.', minProducts: 1, maxProducts: 1 },
  { id: 'novedad', label: 'Novedad', description: '«Nuevo en el catálogo» con insignia y precio.', minProducts: 1, maxProducts: 1 },
  { id: 'coleccion', label: 'Carrusel de colección', description: 'Portada + una lámina por producto + cierre (2 a 8 productos).', minProducts: 2, maxProducts: 8 },
];

export interface AdFormat {
  id: AdFormatId;
  label: string;
  hint: string;
  width: number;
  height: number;
}

export const AD_FORMATS: AdFormat[] = [
  { id: 'feed', label: 'Feed 4:5', hint: 'Instagram y Facebook (publicación)', width: 1080, height: 1350 },
  { id: 'cuadrado', label: 'Cuadrado 1:1', hint: 'Facebook, WhatsApp (chat)', width: 1080, height: 1080 },
  { id: 'historia', label: 'Historia 9:16', hint: 'Historias, Reels y estados de WhatsApp', width: 1080, height: 1920 },
];

export function getStyle(id: string): AdStyle | undefined {
  return AD_STYLES.find((s) => s.id === id);
}
export function getType(id: string): AdType | undefined {
  return AD_TYPES.find((t) => t.id === id);
}
export function getFormat(id: string): AdFormat | undefined {
  return AD_FORMATS.find((f) => f.id === id);
}

/** Datos mínimos de un producto para armar un anuncio. */
export interface AdProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  isStartingPrice: boolean;
  imageUrl: string;
  category: string;
}

export interface AdOptions {
  /** Título de la portada del carrusel. */
  title?: string;
  /** % de descuento (oferta). */
  discountPercent?: number;
  /** Vigencia en texto libre (oferta), ej. «Hasta el domingo». */
  deadline?: string;
  /** Indicación extra para el texto, ej. «menciona entrega en 3 días». */
  note?: string;
  /** Poner un texto descriptivo en la primera imagen (por defecto sí). */
  showImageText?: boolean;
  /** Texto propio para la imagen (sin límite de largo); vacío = lo escribe la IA. */
  imageText?: string;
}

export function formatPrice(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return '$' + rounded.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}

/** Un anuncio guardado en el historial (fila de `ad_creatives`). */
export interface AdRecord {
  id: string;
  type: AdTypeId;
  style: AdStyleId;
  format: AdFormatId;
  productIds: string[];
  productNames: string[];
  options: AdOptions;
  imageUrls: string[];
  caption: string;
  variants: { label: string; text: string }[];
  hashtags: string[];
  whatsappText: string;
  createdAt: string;
}
