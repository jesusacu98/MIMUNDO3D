'use client';

import { Trash2 } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';

interface DeleteBannerButtonProps {
  bannerTitle: string;
  action: (formData: FormData) => void | Promise<void>;
}

export default function DeleteBannerButton({ bannerTitle, action }: DeleteBannerButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`¿Borrar el banner "${bannerTitle}"? Esto no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <SubmitButton
        aria-label={`Borrar ${bannerTitle}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Borrar
      </SubmitButton>
    </form>
  );
}
