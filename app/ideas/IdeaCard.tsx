import Link from 'next/link';
import { Check, ExternalLink, Plus, Store, Wand2 } from 'lucide-react';
import { formatIdeaPrice } from '@/lib/ideas/format';
import type { IdeaCardData } from '@/lib/ideas/types';

interface IdeaCardProps {
  idea: IdeaCardData;
  added: boolean;
  onToggle: (idea: IdeaCardData) => void;
}

export default function IdeaCard({ idea, added, onToggle }: IdeaCardProps) {
  return (
    <article
      className={`flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition-colors ${
        added ? 'border-primary/50 ring-1 ring-primary/20' : 'border-zinc-200/80 hover:border-primary/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-bold leading-snug text-zinc-950">{idea.title}</h3>
        {idea.product ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-500/20">
            <Store className="h-3 w-3" />
            En catálogo
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary-dark ring-1 ring-primary/20">
            <Wand2 className="h-3 w-3" />A la medida
          </span>
        )}
      </div>

      {idea.description && <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{idea.description}</p>}

      {idea.product && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs">
          <span className="font-semibold text-zinc-800">{formatIdeaPrice(idea.product)}</span>
          <Link
            href={idea.product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary-dark hover:underline"
          >
            Ver producto
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="mt-auto pt-4" />
      <button
        type="button"
        onClick={() => onToggle(idea)}
        aria-pressed={added}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer ${
          added
            ? 'bg-primary/10 text-primary-dark hover:bg-primary/15'
            : 'bg-zinc-950 text-white hover:bg-primary'
        }`}
      >
        {added ? (
          <>
            <Check className="h-4 w-4" />
            En mi cotización
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Agregar a mi cotización
          </>
        )}
      </button>
    </article>
  );
}
