'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { buildQuoteSummary } from '@/lib/ideas/whatsapp';
import type { QuoteItem } from '@/lib/ideas/types';

export default function CopySummaryButton({ need, items }: { need: string; items: QuoteItem[] }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildQuoteSummary({ need, items, origin: window.location.origin }));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin permiso de portapapeles: no hay nada más que hacer
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary cursor-pointer"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? 'Resumen copiado' : 'Copiar resumen'}
    </button>
  );
}
