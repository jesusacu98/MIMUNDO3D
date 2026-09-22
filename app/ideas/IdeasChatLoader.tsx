'use client';

import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';

// El chat guarda la conversación y la lista de cotización en localStorage, así que se
// renderiza sólo en el navegador (ssr: false). Mientras carga se muestra un esqueleto.
const IdeasChat = dynamic(() => import('./IdeasChat'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center" aria-busy="true">
      <div className="mb-5 flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-lg shadow-primary/25">
        <Sparkles className="h-7 w-7" />
      </div>
      <p className="text-sm text-zinc-500">Preparando tu asistente de ideas...</p>
    </div>
  ),
});

export default function IdeasChatLoader() {
  return <IdeasChat />;
}
