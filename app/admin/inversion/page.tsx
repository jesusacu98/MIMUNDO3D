import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import AdminHeader from '../AdminHeader';
import DeleteInvestmentButton from './DeleteInvestmentButton';
import { deleteInvestment } from './actions';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function AdminInversionPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const { data: investmentsData } = await supabaseAdmin
    .from('investments')
    .select('id, expense_date, description, cost, paid_by')
    .order('expense_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  const investments = investmentsData ?? [];
  const total = investments.reduce((sum, i) => sum + i.cost, 0);

  const totalsByPayer = new Map<string, number>();
  for (const i of investments) {
    totalsByPayer.set(i.paid_by, (totalsByPayer.get(i.paid_by) ?? 0) + i.cost);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AdminHeader email={user.email ?? ''} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Inversión</h1>
            <p className="text-zinc-600">
              {investments.length} gasto(s) registrado(s) · Total {currency.format(total)}
            </p>
          </div>
          <Link
            href="/admin/inversion/nuevo"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Agregar gasto
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</p>}

        {totalsByPayer.size > 0 && (
          <div className="flex flex-wrap gap-4 mb-8">
            {Array.from(totalsByPayer.entries()).map(([payer, amount]) => (
              <div key={payer} className="bg-white border border-zinc-200/60 rounded-2xl px-5 py-4">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{payer}</p>
                <p className="text-xl font-extrabold text-zinc-950">{currency.format(amount)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Mobile: tarjetas apiladas */}
        <div className="sm:hidden bg-white border border-zinc-200/60 rounded-2xl overflow-hidden divide-y divide-zinc-100">
          {investments.map((investment) => (
            <Link
              key={investment.id}
              href={`/admin/inversion/${investment.id}/editar`}
              className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-zinc-50"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 truncate">{investment.description}</p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {formatDate(investment.expense_date)} · {investment.paid_by}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-zinc-900">{currency.format(investment.cost)}</span>
                <Pencil className="w-4 h-4 text-primary" />
              </div>
            </Link>
          ))}
          {investments.length === 0 && <p className="px-4 py-10 text-center text-zinc-500 text-sm">Todavía no hay gastos.</p>}
        </div>

        {/* Desktop/tablet: tabla completa */}
        <div className="hidden sm:block bg-white border border-zinc-200/60 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Fecha</th>
                <th className="text-left px-5 py-3 font-semibold">Concepto</th>
                <th className="text-left px-5 py-3 font-semibold">Costo</th>
                <th className="text-left px-5 py-3 font-semibold">Compró</th>
                <th className="px-5 py-3" />
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {investments.map((investment) => (
                <tr key={investment.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3 text-zinc-600 whitespace-nowrap">{formatDate(investment.expense_date)}</td>
                  <td className="px-5 py-3 font-medium text-zinc-900">{investment.description}</td>
                  <td className="px-5 py-3 text-zinc-600 whitespace-nowrap">{currency.format(investment.cost)}</td>
                  <td className="px-5 py-3 text-zinc-600">{investment.paid_by}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/inversion/${investment.id}/editar`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DeleteInvestmentButton label={investment.description} action={deleteInvestment.bind(null, investment.id)} />
                  </td>
                </tr>
              ))}
              {investments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-zinc-500">
                    Todavía no hay gastos.
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
