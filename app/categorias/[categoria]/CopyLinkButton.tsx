'use client';

import { useState } from 'react';
import { Link2, Check } from 'lucide-react';

// Copia la URL actual (incluye el filtro elegido) para compartirla.
export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles: ', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark cursor-pointer"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
      {copied ? 'Enlace copiado' : 'Copiar enlace'}
    </button>
  );
}
