import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import AdminHeader from '../AdminHeader';
import CalculadoraCosto from './CalculadoraCosto';

export default async function AdminCalculadoraPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AdminHeader email={user.email ?? ''} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Calculadora de costos</h1>
        <p className="text-zinc-600 mb-8">Calcula el costo de impresión y el precio de venta sugerido.</p>

        <CalculadoraCosto />
      </main>
    </div>
  );
}
