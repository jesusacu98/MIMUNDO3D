import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ClientForm from '../../ClientForm';
import { updateNfcClient } from '../../actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditarClienteNfcPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, logo_url, brand_color, client_bank_accounts (bank_name, account_holder_name, card_number, interbank_clabe)')
    .eq('id', Number(id))
    .maybeSingle();

  if (!client) notFound();

  const account = client.client_bank_accounts?.[0];
  const updateNfcClientWithId = updateNfcClient.bind(null, id);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/clientes-nfc" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a clientes NFC
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Editar cliente</h1>

        <ClientForm
          action={updateNfcClientWithId}
          error={error}
          submitLabel="Guardar cambios"
          initialValues={{
            name: client.name,
            logo_url: client.logo_url,
            brand_color: client.brand_color,
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
