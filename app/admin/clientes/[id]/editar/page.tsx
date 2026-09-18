import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ClientForm from '../../ClientForm';
import { updateClient } from '../../actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; tab?: string }>;
}

export default async function EditarClientePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error, tab } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select(
      'id, name, logo_url, brand_color, whatsapp_number, client_bank_accounts (bank_name, account_holder_name, card_number, interbank_clabe), client_social_links (network, url)'
    )
    .eq('id', Number(id))
    .maybeSingle();

  if (!client) notFound();

  const account = client.client_bank_accounts?.[0];
  const updateClientWithId = updateClient.bind(null, id);
  const socialLinks: Record<string, string> = {};
  for (const link of client.client_social_links ?? []) socialLinks[link.network] = link.url;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/clientes" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a clientes
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Editar cliente</h1>

        <ClientForm
          action={updateClientWithId}
          clientId={client.id}
          socialLinks={socialLinks}
          initialTab={tab === 'redes' ? 'redes' : 'nfc'}
          error={error}
          submitLabel="Guardar cambios"
          initialValues={{
            name: client.name,
            logo_url: client.logo_url,
            brand_color: client.brand_color,
            whatsapp_number: client.whatsapp_number,
            bank_name: account?.bank_name ?? '',
            account_holder_name: account?.account_holder_name ?? '',
            card_number: account?.card_number ?? null,
            interbank_clabe: account?.interbank_clabe ?? null,
          }}
        />
      </main>
    </div>
  );
}
