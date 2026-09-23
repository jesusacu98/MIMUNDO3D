'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lightbulb, X } from 'lucide-react';
import { event } from '@/lib/gtag';

// Botón flotante que promociona a Fili (el asistente de /ideas) en las páginas públicas que no son
// el propio chat — home, catálogo, ficha de producto y categorías (se agrega junto a <SiteHeader />
// en cada una, ver ARQUITECTURA.md). El mensajito se muestra en cada carga de página a propósito
// (no se recuerda entre visitas ni queda guardado en localStorage): sólo se oculta si se cierra con
// la "×", y vuelve a aparecer al recargar la página o navegar a otra.

export default function IdeasFab() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="hidden items-center gap-2 rounded-full bg-zinc-950 py-2 pl-4 pr-2 text-xs font-medium text-white shadow-lg shadow-zinc-900/20 sm:flex cursor-pointer"
      >
        Conocé a Fili, tu compañero de ideas
        <span className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-white/10">
          <X className="h-3.5 w-3.5" />
        </span>
      </button>

      <Link
        href="/ideas"
        onClick={() => event('ideas_fab_click', { source: 'floating_button' })}
        aria-label="Fili, el asistente de ideas de MiMundo3D"
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105"
      >
        <Lightbulb className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 rounded-full bg-zinc-950 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white ring-2 ring-white">
          Nuevo
        </span>
      </Link>
    </div>
  );
}
