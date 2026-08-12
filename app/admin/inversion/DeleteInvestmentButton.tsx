'use client';

import { Trash2 } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';

interface DeleteInvestmentButtonProps {
  label: string;
  action: (formData: FormData) => void | Promise<void>;
}

export default function DeleteInvestmentButton({ label, action }: DeleteInvestmentButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`¿Borrar el gasto "${label}"? Esto no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <SubmitButton
        aria-label={`Borrar ${label}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Borrar
      </SubmitButton>
    </form>
  );
}
