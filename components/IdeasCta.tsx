'use client';

import Link from 'next/link';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { event } from '@/lib/gtag';

// Tarjeta que invita a hablar con Fili (el asistente de /ideas) al final de una lista de productos.
export default function IdeasCta() {
  return (
    <section className="mt-12 rounded-2xl border border-zinc-200/70 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/30">
        <Lightbulb className="h-7 w-7" />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-primary uppercase tracking-wider">Fili, tu compañero de ideas</p>
        <h2 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-950">¿No encontraste algo que te gustó?</h2>
        <p className="mt-1.5 text-zinc-600 leading-relaxed">Preguntame lo que estás buscando y te doy ideas.</p>
      </div>

      <Link
        href="/ideas"
        onClick={() => event('ideas_cta_click', { source: 'category_page' })}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:brightness-95 active:scale-95"
      >
        Hablar con Fili
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
