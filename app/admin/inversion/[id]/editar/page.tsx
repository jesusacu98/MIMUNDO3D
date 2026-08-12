import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import InvestmentForm from '../../InvestmentForm';
import { updateInvestment } from '../../actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}

export default async function EditarInversionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const { data: investment } = await supabaseAdmin
    .from('investments')
    .select('id, expense_date, description, cost, paid_by')
    .eq('id', id)
    .maybeSingle();

  if (!investment) notFound();

  const updateInvestmentWithId = updateInvestment.bind(null, id);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin/inversion" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a inversión
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-8">Editar gasto</h1>

        <InvestmentForm
          action={updateInvestmentWithId}
          error={error}
          submitLabel="Guardar cambios"
          initialValues={{
            expense_date: investment.expense_date ?? '',
            description: investment.description,
            cost: String(investment.cost),
            paid_by: investment.paid_by,
          }}
        />
      </main>
    </div>
  );
}
