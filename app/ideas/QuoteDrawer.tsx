'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, ExternalLink, Loader2, Minus, Plus, Trash2, X } from 'lucide-react';
import { WhatsAppIcon } from '@/app/catalogo/icons';
import { formatIdeaPrice } from '@/lib/ideas/format';
import { IDEAS_LIMITS, type QuoteItem } from '@/lib/ideas/types';

interface QuoteDrawerProps {
  open: boolean;
  onClose: () => void;
  items: QuoteItem[];
  /** Generando el enlace de la cotización. */
  sending: boolean;
  /** Enlace de WhatsApp para abrir a mano cuando el navegador bloqueó la ventana emergente. */
  manualHref: string | null;
  onQuantity: (id: string, delta: number) => void;
  onNote: (id: string, note: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onAddCustom: (text: string) => void;
  onSend: () => void | Promise<void>;
}

export default function QuoteDrawer({
  open,
  onClose,
  items,
  sending,
  manualHref,
  onQuantity,
  onNote,
  onRemove,
  onClear,
  onAddCustom,
  onSend,
}: QuoteDrawerProps) {
  const [customText, setCustomText] = useState('');

  // Escape cierra el panel y el fondo de la página no se desplaza mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const submitCustom = () => {
    const text = customText.trim();
    if (!text) return;
    onAddCustom(text);
    setCustomText('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Mi cotización">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[2px] cursor-default" />

      <aside className="relative flex h-full w-full max-w-md flex-col bg-zinc-50 shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-zinc-950">Mi cotización</h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">{items.length}</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {items.length === 0 && (
            <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
              Aún no guardas ideas. Toca <strong className="text-zinc-700">&ldquo;Agregar a mi cotización&rdquo;</strong> en las que te gusten.
            </p>
          )}

          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-200/80 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-snug text-zinc-950">{item.title}</p>
                  {item.product ? (
                    <Link
                      href={item.product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary-dark hover:underline"
                    >
                      {formatIdeaPrice(item.product)} · Ver en catálogo
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{item.custom ? item.description : 'Idea a la medida'}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Quitar ${item.title}`}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="inline-flex items-center rounded-lg border border-zinc-200">
                  <button type="button" onClick={() => onQuantity(item.id, -1)} disabled={item.quantity <= 1} aria-label="Menos" className="p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 cursor-pointer">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                  <button type="button" onClick={() => onQuantity(item.id, 1)} disabled={item.quantity >= 999} aria-label="Más" className="p-2 text-zinc-600 hover:bg-zinc-50 disabled:opacity-30 cursor-pointer">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={item.note}
                  maxLength={IDEAS_LIMITS.maxNoteChars}
                  onChange={(e) => onNote(item.id, e.target.value)}
                  placeholder="Nota (color, medidas...)"
                  aria-label={`Nota para ${item.title}`}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          ))}

          {items.length < IDEAS_LIMITS.maxQuoteItems && (
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5">
              <label htmlFor="custom-idea" className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                ¿Traes tu propia idea?
              </label>
              <p className="mt-1 text-xs text-zinc-500">Descríbela o pega el enlace de una referencia (Pinterest, ChatGPT, una foto en línea...).</p>
              <div className="mt-2 flex gap-2">
                <input
                  id="custom-idea"
                  type="text"
                  value={customText}
                  maxLength={300}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
                  placeholder="Ej. display de mesa como este: https://..."
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="button" onClick={submitCustom} disabled={!customText.trim()} className="rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-primary disabled:opacity-40 cursor-pointer">
                  Agregar
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-zinc-200 bg-white px-5 py-4 space-y-3">
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={items.length === 0 || sending}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-all ${
              items.length === 0
                ? 'bg-zinc-300 shadow-none cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-primary-dark shadow-primary/20 hover:brightness-95 active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-wait'
            }`}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando tu lista...
              </>
            ) : (
              <>
                <WhatsAppIcon className="h-4 w-4" />
                Enviar a cotizar por WhatsApp
              </>
            )}
          </button>
          {manualHref && (
            <a
              href={manualHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Tu navegador bloqueó la ventana. Toca aquí para abrir WhatsApp
            </a>
          )}
          <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
            <span>Se abre WhatsApp con un enlace a tu lista; el equipo te responde con la cotización.</span>
            {items.length > 0 && (
              <button type="button" onClick={onClear} className="shrink-0 font-medium text-zinc-500 underline hover:text-red-600 cursor-pointer">
                Vaciar
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}
