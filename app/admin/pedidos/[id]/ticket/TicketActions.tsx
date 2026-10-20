'use client';

import { useState } from 'react';
import { Download, ExternalLink, Share2 } from 'lucide-react';

const buttonClass =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 cursor-pointer';

export default function TicketActions({ src, fileName }: { src: string; fileName: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function share() {
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error('ticket');
      const file = new File([await res.blob()], fileName, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        setMessage('Este navegador no deja compartir el PDF directo. Descárgalo y mándalo por WhatsApp.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage('No se pudo compartir la nota.');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <a
          href={`${src}?download=1`}
          className={`${buttonClass} bg-gradient-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/20 hover:brightness-95`}
        >
          <Download className="w-4 h-4" />
          Descargar PDF
        </a>
        {canShare && (
          <button type="button" onClick={share} className={`${buttonClass} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50`}>
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
        )}
        <a href={src} target="_blank" rel="noreferrer" className={`${buttonClass} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50`}>
          <ExternalLink className="w-4 h-4" />
          Abrir en otra pestaña
        </a>
      </div>
      {message && <p className="text-sm text-amber-700">{message}</p>}
    </div>
  );
}
