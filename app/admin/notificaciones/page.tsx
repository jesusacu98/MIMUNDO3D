import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getNotifySettings, toSafeView } from '@/lib/notify/settings';
import NotifySettingsForm from './NotifySettingsForm';
import { clearSmtpPass, saveNotifySettings } from './actions';

interface PageProps {
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export default async function NotifySettingsPage({ searchParams }: PageProps) {
  const { error, ok } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const settings = toSafeView(await getNotifySettings());

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Notificaciones</h1>
          <p className="text-zinc-600">
            Si falla una llamada real a IA (no la simulación) en el chat de ideas o en el generador de diseños, se manda un correo de
            aviso con la configuración de abajo. Se guarda en la base de datos y aplica al instante, sin necesidad de volver a
            desplegar el sitio.
          </p>
        </div>

        {error && <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
        {ok && <p className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Cambios guardados.</p>}

        <NotifySettingsForm settings={settings} saveAction={saveNotifySettings} clearPassAction={clearSmtpPass} />
      </main>
    </div>
  );
}
