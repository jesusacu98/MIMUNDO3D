import { Backpack, Boxes, Gift, House, KeyRound, Magnet, PartyPopper, Sofa, Sparkles, Store, type LucideIcon } from 'lucide-react';

// Encabezado de las páginas de categoría (/categorias/[slug]). Server Component. Mismo lenguaje
// visual que los carruseles del inicio (components/ProductCarousel.tsx): etiqueta con ícono, título
// con la última palabra en degradado de acento y una barra corta junto a la descripción — a escala
// de portada. Las animaciones son CSS puro (ver globals.css) y se desactivan con "reducir movimiento".

// Ícono por categoría (por slug); las que no están aquí usan Sparkles.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  llaveros: KeyRound,
  negocios: Store,
  hogar: House,
  escolares: Backpack,
  imanes: Magnet,
  eventos: PartyPopper,
  decoracion: Sofa,
  mayoreo: Boxes,
  'organizadores-y-utilidades': Boxes,
  regalos: Gift,
};

interface CategoryHeroProps {
  slug: string;
  name: string;
  headline?: string;
  description?: string;
  productCount: number;
}

export default function CategoryHero({ slug, name, headline, description, productCount }: CategoryHeroProps) {
  const Icon = CATEGORY_ICONS[slug] ?? Sparkles;

  // La última palabra del título lleva el degradado de acento.
  const words = (headline ?? name).trim().split(/\s+/);
  const lastWord = words.pop() ?? '';
  const leading = words.join(' ');

  return (
    <header className="relative isolate mb-10 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white px-6 py-9 sm:px-10 sm:py-12 lg:px-14 lg:py-14">
      {/* Ícono de la categoría, gigante y muy tenue, como sello de fondo */}
      <Icon
        aria-hidden
        strokeWidth={1.25}
        className="animate-fade-up pointer-events-none absolute -right-6 -bottom-10 -z-10 hidden h-64 w-64 -rotate-12 text-primary/10 sm:block lg:right-8 lg:h-80 lg:w-80"
        style={{ '--delay': '300ms' } as React.CSSProperties}
      />

      <div className="max-w-3xl">
        <div className="animate-fade-up flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-dark ring-1 ring-inset ring-primary/20">
            <Icon className="h-3.5 w-3.5" />
            {headline ? name : 'Categoría'}
          </span>
          {productCount > 0 && (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 ring-1 ring-inset ring-zinc-200">
              {productCount} {productCount === 1 ? 'producto' : 'productos'}
            </span>
          )}
        </div>

        <h1
          className="animate-fade-up mt-5 text-4xl font-black leading-[1.05] tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl"
          style={{ '--delay': '100ms' } as React.CSSProperties}
        >
          {leading && `${leading} `}
          <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">{lastWord}</span>
        </h1>

        <div className="mt-5 flex items-start gap-4">
          <span
            className="animate-draw-line mt-[0.7em] h-1.5 w-14 shrink-0 origin-left rounded-full bg-gradient-to-r from-primary to-primary-dark"
            style={{ '--delay': '400ms' } as React.CSSProperties}
          />
          {description && (
            <p
              className="animate-fade-up max-w-xl text-base leading-relaxed text-zinc-500 sm:text-lg"
              style={{ '--delay': '250ms' } as React.CSSProperties}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
