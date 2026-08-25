import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Pencil, ExternalLink, ImageOff } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import AdminHeader from '../AdminHeader';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ClientesNfcPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const { data: clientsData } = await supabaseAdmin
    .from('clients')
    .select('id, name, logo_url, brand_color, client_bank_accounts (bank_name, account_holder_name, card_number, interbank_clabe)')
    .order('id', { ascending: false });

  const clients = clientsData ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AdminHeader email={user.email ?? ''} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Clientes NFC</h1>
            <p className="text-zinc-600">
              {clients.length} cliente(s) con página de pago (<span className="font-mono">/pago/[id]</span>) para su letrero NFC.
            </p>
          </div>
          <Link
            href="/admin/clientes-nfc/nuevo"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Dar de alta cliente
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</p>}

        <div className="bg-white border border-zinc-200/60 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3" />
                <th className="text-left px-5 py-3 font-semibold">Cliente</th>
                <th className="text-left px-5 py-3 font-semibold">Banco</th>
                <th className="text-left px-5 py-3 font-semibold">Cuenta / CLABE</th>
                <th className="text-left px-5 py-3 font-semibold">Página de pago</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clients.map((client) => {
                const account = client.client_bank_accounts?.[0];
                return (
                  <tr key={client.id} className="hover:bg-zinc-50/60">
                    <td className="px-5 py-3">
                      <div className="relative w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-200 overflow-hidden flex items-center justify-center">
                        {client.logo_url ? (
                          <Image src={client.logo_url} alt={`Logo de ${client.name}`} fill sizes="36px" className="object-contain" />
                        ) : (
                          <ImageOff className="w-4 h-4 text-zinc-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-zinc-900">
                      <div className="flex items-center gap-2">
                        {client.brand_color && (
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: client.brand_color }}
                            title={client.brand_color}
                          />
                        )}
                        {client.name}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{account?.bank_name ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-600 font-mono text-xs">
                      {account?.interbank_clabe || account?.card_number || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={`/pago/${client.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-primary"
                      >
                        /pago/{client.id}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/clientes-nfc/${client.id}/editar`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                    Todavía no hay clientes dados de alta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
