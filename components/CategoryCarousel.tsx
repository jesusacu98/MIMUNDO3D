'use client';

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Carrusel de "Explora por categoría" del inicio: cada hijo es una categoría. Se desliza con el dedo
// o el trackpad (scroll-snap nativo) y además tiene flechas y puntos. Se ve 1 categoría en celular
// (con un pedacito de la siguiente para invitar a deslizar), 2 en tableta y 3 en escritorio; si
// caben todas, no hay flechas ni puntos y quedan centradas.
//
// Avanza solo cada 2 segundos, una categoría a la vez, y al llegar al final regresa al inicio. Se
// pausa mientras el mouse está encima, si la sección no se ve, si la pestaña está oculta, con
// "reducir movimiento" activado, y unos segundos tras cualquier interacción del usuario.

// Mismos anchos que la separación `gap-6` (1.5rem) del contenedor.
const AUTO_SCROLL_MS = 2000;
const PAUSE_AFTER_INTERACTION_MS = 6000;

const ITEM_WIDTH = 'w-[82%] sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]';

export default function CategoryCarousel({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const visibleRef = useRef(true);
  const pausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [positions, setPositions] = useState(1);

  const items = Children.toArray(children);

  // Tras una interacción del usuario, el avance automático espera unos segundos.
  const pauseAutoScroll = () => {
    pausedRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      pausedRef.current = false;
    }, PAUSE_AFTER_INTERACTION_MS);
  };

  const getStep = useCallback(() => {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.offsetWidth + gap;
  }, []);

  // Cuántas posiciones de scroll hay (una por categoría que queda fuera de la vista + 1).
  const measure = useCallback(() => {
    const track = trackRef.current;
    const step = getStep();
    if (!track || step === 0) return;
    const overflow = track.scrollWidth - track.clientWidth;
    setPositions(overflow > 4 ? Math.round(overflow / step) + 1 : 1);
  }, [getStep]);

  useEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure, items.length]);

  useEffect(() => {
    if (positions < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const track = trackRef.current;
    if (!track) return;

    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
    });
    observer.observe(track);

    const interval = setInterval(() => {
      if (hoveredRef.current || !visibleRef.current || document.hidden || pausedRef.current) return;

      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (atEnd) track.scrollTo({ left: 0, behavior: 'smooth' });
      else track.scrollBy({ left: getStep(), behavior: 'smooth' });
    }, AUTO_SCROLL_MS);

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
    // activeIndex: reinicia el temporizador tras cada movimiento (también los manuales).
  }, [positions, activeIndex, getStep]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  const handleScroll = () => {
    const step = getStep();
    const track = trackRef.current;
    if (!track || step === 0) return;
    setActiveIndex(Math.min(positions - 1, Math.max(0, Math.round(track.scrollLeft / step))));
  };

  const scrollToIndex = (index: number) => {
    pauseAutoScroll();
    trackRef.current?.scrollTo({ left: index * getStep(), behavior: 'smooth' });
  };

  if (items.length === 0) return null;

  const overflows = positions > 1;
  const arrowClass =
    'w-10 h-10 rounded-full bg-white border border-zinc-200 shadow-sm text-zinc-600 flex items-center justify-center transition-all active:scale-95 enabled:hover:text-white enabled:hover:bg-primary enabled:hover:border-primary enabled:cursor-pointer disabled:opacity-40';

  return (
    <div>
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
        className={`flex gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 no-scrollbar ${overflows ? '' : 'justify-center'}`}
      >
        {items.map((item, i) => (
          <div key={i} className={`snap-start shrink-0 ${ITEM_WIDTH}`}>
            {item}
          </div>
        ))}
      </div>

      {overflows && (
        <div className="mt-8 flex items-center justify-center gap-5">
          <button type="button" onClick={() => scrollToIndex(activeIndex - 1)} disabled={activeIndex === 0} aria-label="Categoría anterior" className={arrowClass}>
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: positions }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Ir a la posición ${i + 1}`}
                aria-current={i === activeIndex}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${i === activeIndex ? 'w-8 bg-primary' : 'w-2 bg-zinc-300 hover:bg-zinc-400'}`}
              />
            ))}
          </div>

          <button type="button" onClick={() => scrollToIndex(activeIndex + 1)} disabled={activeIndex === positions - 1} aria-label="Categoría siguiente" className={arrowClass}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
