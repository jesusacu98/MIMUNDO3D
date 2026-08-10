'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError('Correo o contraseña incorrectos.');
      setLoading(false);
      return;
    }

    router.push('/admin');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Panel de Administración</h1>
          <p className="text-xs text-slate-500 mt-2">Inicia sesión para gestionar el catálogo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Correo
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white shadow-md shadow-primary/20 transition-all active:scale-98 disabled:opacity-60 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
