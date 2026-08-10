'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';

interface ProductThumbProps {
  src: string;
  alt: string;
  size?: number;
}

export default function ProductThumb({ src, alt, size = 48 }: ProductThumbProps) {
  const [errored, setErrored] = useState(!src);

  return (
    <div
      className="relative shrink-0 rounded-lg bg-zinc-100 overflow-hidden flex items-center justify-center border border-zinc-200/60"
      style={{ width: size, height: size }}
    >
      {errored ? (
        <ImageOff className="w-4 h-4 text-zinc-300" />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${size}px`}
          className="object-cover"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
