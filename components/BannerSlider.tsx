'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '@/lib/banners';

const AUTOPLAY_MS = 1500;
const PAUSE_AFTER_INTERACTION_MS = 8000;

function BannerImage({ banner, priority }: { banner: Banner; priority: boolean }) {
  const sizes = '(max-width: 1280px) 100vw, 1280px';
  return (
    <>
      {banner.mobileImageUrl ? (
        <>
          <Image src={banner.mobileImageUrl} alt={banner.title} fill sizes={sizes} priority={priority} className="object-cover sm:hidden" />
          <Image src={banner.imageUrl} alt={banner.title} fill sizes={sizes} priority={priority} className="object-cover hidden sm:block" />
        </>
      ) : (
        <Image src={banner.imageUrl} alt={banner.title} fill sizes={sizes} priority={priority} className="object-cover" />
      )}
    </>
  );
}

interface BannerSliderProps {
  banners: Banner[];
  // Proporción del slider; por defecto 16:9 en celular y 3:1 en escritorio.
  aspectClass?: string;
  roundedClass?: string;
  // 'tile': se usa dentro de un enlace (imagen de categoría en el inicio): sin flechas,
  // sin enlaces propios y con puntos decorativos, para no anidar elementos interactivos.
  variant?: 'banner' | 'tile';
}

export default function BannerSlider({
  banners,
  aspectClass = 'aspect-[16/9] sm:aspect-[3/1]',
  roundedClass = 'rounded-3xl',
  variant = 'banner',
}: BannerSliderProps) {
  const tile = variant === 'tile';
  const trackRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const multiple = banners.length > 1;

  const pauseAutoplay = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, PAUSE_AFTER_INTERACTION_MS);
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!multiple) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = setInterval(() => {
      const track = trackRef.current;
      if (!track || hoveredRef.current || pausedRef.current || document.hidden) return;
      const next = Math.round(track.scrollLeft / track.clientWidth) + 1;
      track.scrollTo({ left: (next % banners.length) * track.clientWidth, behavior: 'smooth' });
    }, AUTOPLAY_MS);

    return () => {
      clearInterval(interval);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [multiple, banners.length]);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActiveIndex(Math.min(banners.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
  };

  const arrowClass =
    'hidden sm:flex absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-zinc-700 shadow-md items-center justify-center transition-all active:scale-95 cursor-pointer opacity-0 group-hover/banner:opacity-100 focus-visible:opacity-100';

  return (
    <div
      className="relative group/banner"
      onPointerEnter={(e) => {
        if (e.pointerType === 'mouse') hoveredRef.current = true;
      }}
      onPointerLeave={() => {
        hoveredRef.current = false;
      }}
    >
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onTouchStart={pauseAutoplay}
        onWheel={pauseAutoplay}
        className={`flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar ${roundedClass} ${tile ? '' : 'shadow-md shadow-zinc-900/10 ring-1 ring-black/5'}`}
      >
        {banners.map((banner, i) => {
          const slide = (
            <div className={`relative w-full ${aspectClass} bg-zinc-100`}>
              <BannerImage banner={banner} priority={i === 0} />
            </div>
          );
          const link = tile ? null : banner.linkUrl;
          return (
            <div key={banner.id} className="snap-start shrink-0 w-full">
              {link ? (
                link.startsWith('/') ? (
                  <Link href={link} className="block cursor-pointer" aria-label={banner.title}>
                    {slide}
                  </Link>
                ) : (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="block cursor-pointer" aria-label={banner.title}>
                    {slide}
                  </a>
                )
              ) : (
                slide
              )}
            </div>
          );
        })}
      </div>

      {multiple && !tile && (
        <>
          <button
            type="button"
            aria-label="Banner anterior"
            onClick={() => {
              pauseAutoplay();
              goTo((activeIndex - 1 + banners.length) % banners.length);
            }}
            className={`${arrowClass} left-3`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Banner siguiente"
            onClick={() => {
              pauseAutoplay();
              goTo((activeIndex + 1) % banners.length);
            }}
            className={`${arrowClass} right-3`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5" role="tablist" aria-label="Posición del banner">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Ir al banner ${i + 1}`}
                onClick={() => {
                  pauseAutoplay();
                  goTo(i);
                }}
                className={`h-1.5 rounded-full shadow-sm transition-all duration-300 cursor-pointer ${
                  i === activeIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {multiple && tile && (
        <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1 pointer-events-none" aria-hidden="true">
          {banners.map((banner, i) => (
            <span
              key={banner.id}
              className={`h-1 rounded-full shadow-sm transition-all duration-300 ${i === activeIndex ? 'w-5 bg-white' : 'w-1 bg-white/60'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
