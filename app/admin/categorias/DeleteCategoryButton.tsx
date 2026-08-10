'use client';

import { Trash2 } from 'lucide-react';

interface DeleteCategoryButtonProps {
  categoryName: string;
  action: (formData: FormData) => void | Promise<void>;
}

export default function DeleteCategoryButton({ categoryName, action }: DeleteCategoryButtonProps) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`¿Borrar la categoría "${categoryName}"? Esto no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        aria-label={`Borrar ${categoryName}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Borrar
      </button>
    </form>
  );
}
