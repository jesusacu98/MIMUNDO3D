'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'disabled'> {
  children: React.ReactNode;
}

// Debe ir dentro de un <form action={...}>: useFormStatus lee el estado
// pending del form padre más cercano.
export default function SubmitButton({ children, className, ...buttonProps }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className ?? ''} disabled:opacity-60 disabled:cursor-not-allowed`}
      {...buttonProps}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}
