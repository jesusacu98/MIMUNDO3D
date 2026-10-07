import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSocialSettings, toSafeView } from '@/lib/social/settings';
import RedesClient from './RedesClient';

export default async function RedesPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const settings = toSafeView(await getSocialSettings());

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Redes sociales</h1>
          <p className="text-zinc-600">
            Conecta tu Página de Facebook y tu cuenta de Instagram para publicar los anuncios directo desde{' '}
            <Link href="/admin/anuncios" className="font-semibold text-primary-dark hover:underline">
              Generador de anuncios
            </Link>
            , sin descargar la imagen ni copiar el texto.
          </p>
        </div>

        <RedesClient settings={settings} />
      </main>
    </div>
  );
}
