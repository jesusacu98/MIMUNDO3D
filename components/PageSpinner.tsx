import { Loader2 } from 'lucide-react';

export default function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}
