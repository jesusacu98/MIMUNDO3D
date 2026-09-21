'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Sparkles, Tag } from 'lucide-react';
import type { Product } from '@/app/catalogo/types';
import { formatPrice } from '@/app/catalogo/types';
import ProductThumbnail from '@/app/catalogo/ProductThumbnail';
import Reveal from '@/components/Reveal';

type Variant = 'trending' | 'new' | 'promo';

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  // Etiqueta sobre la imagen de cada tarjeta (ej. "Tendencia") y su estilo.
  badge?: string;
  variant?: Variant;
  // Query que se agrega al link del producto para que "Volver" regrese al origen (y a su filtro).
  fromQuery?: string;
  // Avanza solo cada pocos segundos; se pausa al interactuar.
  autoScroll?: boolean;
}

const AUTO_SCROLL_MS = 2500;
const PAUSE_AFTER_INTERACTION_MS = 6000;

const VARIANT_STYLES: Record<
  Variant,
  { badge: string; icon: typeof Flame; eyebrow: string; eyebrowClass: string; accent: string }
> = {
  trending: {
    badge: 'bg-gradient-to-r from-orange-500 to-rose-500 shadow-orange-500/30',
    icon: Flame,
    eyebrow: 'En alza',
    eyebrowClass: 'bg-orange-500/10 text-orange-600 ring-orange-500/20',
    accent: 'from-orange-500 to-rose-500',
  },
  new: {
    badge: 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30',
    icon: Sparkles,
    eyebrow: 'Recién llegado',
    eyebrowClass: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20',
    accent: 'from-emerald-500 to-teal-500',
  },
  promo: {
    badge: 'bg-gradient-to-r from-primary to-primary-dark shadow-primary/30',
    icon: Tag,
    eyebrow: 'Ofertas',
    eyebrowClass: 'bg-primary/10 text-primary-dark ring-primary/20',
    accent: 'from-primary to-primary-dark',
  },
};

export default function ProductCarousel({ title, subtitle, products, badge, variant, fromQuery, autoScroll = false }: ProductCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const visibleRef = useRef(true);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Tras una interacción del usuario, el avance automático espera unos segundos.
  const pauseAutoScroll = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, PAUSE_AFTER_INTERACTION_MS);
  };

  // Ancho de un paso: una tarjeta + el espacio entre tarjetas.
  const getStep = () => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.offsetWidth + gap;
  };

  useEffect(() => {
    if (!autoScroll || products.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    });
    observer.observe(track);

    const interval = setInterval(() => {
      if (hoveredRef.current || !visibleRef.current || document.hidden || pausedRef.current) return;
      if (track.scrollWidth <= track.clientWidth + 4) return;

      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (atEnd) track.scrollTo({ left: 0, behavior: 'smooth' });
      else track.scrollBy({ left: getStep(), behavior: 'smooth' });
    }, AUTO_SCROLL_MS);

    return () => {
      clearInterval(interval);
      observer.disconnect();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [autoScroll, products.length, activeIndex]); // activeIndex: reinicia el temporizador en sincronía con la barra de progreso

  if (products.length === 0) return null;

  const scrollByPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    pauseAutoScroll();
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  const scrollToIndex = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    pauseAutoScroll();
    track.scrollTo({ left: index * getStep(), behavior: 'smooth' });
  };

  const handleScroll = () => {
    const track = trackRef.current;
    const step = getStep();
    if (!track || step === 0) return;
    setActiveIndex(Math.min(products.length - 1, Math.round(track.scrollLeft / step)));
  };

  const style = variant ? VARIANT_STYLES[variant] : undefined;
  const BadgeIcon = style?.icon;

  // La última palabra del título lleva el degradado de acento.
  const words = title.trim().split(/\s+/);
  const titleLast = words.pop() ?? '';
  const titleLead = words.join(' ');

  const arrowClass =
    'w-10 h-10 rounded-full bg-white border border-zinc-200 shadow-sm text-zinc-600 hover:text-white hover:bg-primary hover:border-primary flex items-center justify-center transition-all active:scale-95 cursor-pointer';

  return (
    <div className="carousel-root">
      <Reveal>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div className="min-w-0">
          {style && BadgeIcon && (
            <span
              className={`inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.14em] ring-1 ring-inset ${style.eyebrowClass}`}
            >
              <BadgeIcon className="w-3.5 h-3.5" />
              {style.eyebrow}
            </span>
          )}
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-[1.05] text-zinc-950">
            {titleLead && `${titleLead} `}
            <span className={`bg-gradient-to-r bg-clip-text text-transparent ${style?.accent ?? 'from-primary to-primary-dark'}`}>
              {titleLast}
            </span>
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <span className={`h-1 w-10 shrink-0 rounded-full bg-gradient-to-r ${style?.accent ?? 'from-primary to-primary-dark'}`} />
            {subtitle && <p className="text-sm sm:text-base text-zinc-500">{subtitle}</p>}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => scrollByPage(-1)} aria-label="Anterior" className={arrowClass}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button type="button" onClick={() => scrollByPage(1)} aria-label="Siguiente" className={arrowClass}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      </Reveal>

      <Reveal delay={120}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') hoveredRef.current = true;
        }}
        onPointerLeave={() => {
          hoveredRef.current = false;
        }}
        onTouchStart={pauseAutoScroll}
        onWheel={pauseAutoScroll}
        onFocus={pauseAutoScroll}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pt-2 pb-6 -mb-2 no-scrollbar"
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/catalogo/${product.id}${fromQuery ? `?${fromQuery}` : ''}`}
            className="snap-start shrink-0 w-64 sm:w-72 bg-white p-2 border border-zinc-200/70 rounded-[1.75rem] overflow-hidden shadow-md shadow-zinc-900/10 ring-1 ring-black/5 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 group flex flex-col cursor-pointer"
          >
            <div className="aspect-square w-full bg-zinc-50 relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-110">
                <ProductThumbnail src={product.image} alt={product.name} sizes="288px" />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />
              {badge && (
                <span
                  className={`absolute top-3 left-3 z-10 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-white text-[11px] font-bold uppercase tracking-wide shadow-lg ${
                    style?.badge ?? 'bg-primary shadow-primary/30'
                  }`}
                >
                  {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
                  {badge}
                </span>
              )}
            </div>
            <div className="px-3 pt-4 pb-3 flex flex-col flex-grow">
              {product.category && (
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider mb-1">{product.category}</span>
              )}
              <h3 className="text-base font-bold text-zinc-950 mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-4 flex-grow">{product.description}</p>
              <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                <span className="text-lg font-extrabold text-zinc-950">{formatPrice(product)}</span>
                <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      </Reveal>

      {products.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-2" role="tablist" aria-label="Posición del carrusel">
          {products.map((product, i) => (
            <button
              key={product.id}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Ir al producto ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-300 cursor-pointer ${
                i === activeIndex ? 'w-8 bg-primary/20' : 'w-1.5 bg-zinc-300 hover:bg-zinc-400'
              }`}
            >
              {i === activeIndex && (
                <span
                  key={activeIndex}
                  className={`absolute inset-0 rounded-full bg-primary origin-left ${autoScroll ? 'dot-progress' : ''}`}
                  style={autoScroll ? { animationDuration: `${AUTO_SCROLL_MS}ms` } : undefined}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
