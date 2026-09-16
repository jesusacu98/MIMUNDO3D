'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Printer } from 'lucide-react';

export default function ProductThumbnail({
  src,
  alt,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
}: {
  src: string;
  alt: string;
  sizes?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(243,76,145,0.12),rgba(255,255,255,0))]" />
        <Printer className="w-12 h-12 text-zinc-300 mb-3 group-hover:text-primary transition-colors duration-300 z-10" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest z-10">
          Visualizar Pieza
        </span>
      </div>
    );
  }

  return <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" onError={() => setErrored(true)} />;
}
