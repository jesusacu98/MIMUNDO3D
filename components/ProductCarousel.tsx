'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Flame, Sparkles, Tag } from 'lucide-react';
import type { Product } from '@/app/catalogo/types';
import { formatPrice } from '@/app/catalogo/types';
import ProductThumbnail from '@/app/catalogo/ProductThumbnail';

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

const AUTO_SCROLL_MS = 3500;
const PAUSE_AFTER_INTERACTION_MS = 6000;

const VARIANT_STYLES: Record<Variant, { badge: string; icon: typeof Flame }> = {
  trending: { badge: 'bg-gradient-to-r from-orange-500 to-rose-500 shadow-orange-500/30', icon: Flame },
  new: { badge: 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30', icon: Sparkles },
  promo: { badge: 'bg-gradient-to-r from-primary to-primary-dark shadow-primary/30', icon: Tag },
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
  }, [autoScroll, products.length]);

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

  const arrowClass =
    'w-10 h-10 rounded-full bg-white border border-zinc-200 shadow-sm text-zinc-600 hover:text-white hover:bg-primary hover:border-primary flex items-center justify-center transition-all active:scale-95 cursor-pointer';

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {BadgeIcon && (
            <span className={`hidden sm:flex w-12 h-12 rounded-2xl text-white items-center justify-center shadow-lg ${style?.badge}`}>
              <BadgeIcon className="w-6 h-6" />
            </span>
          )}
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
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
            className="snap-start shrink-0 w-64 sm:w-72 bg-white border border-zinc-200/70 rounded-3xl overflow-hidden shadow-sm hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 group flex flex-col cursor-pointer"
          >
            <div className="aspect-square w-full bg-zinc-50 relative overflow-hidden">
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
            <div className="p-5 flex flex-col flex-grow">
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
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                i === activeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-zinc-300 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
