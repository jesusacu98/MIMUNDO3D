import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loadTicketData } from '@/lib/pedidos/loadTicket';
import TicketActions from './TicketActions';

export default async function TicketPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const data = await loadTicketData(id);
  if (!data) notFound();

  const src = `/api/admin/pedidos/${id}/ticket`;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <Link href={`/admin/pedidos/${id}/editar`} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="w-4 h-4" />
          Volver al pedido
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Nota del pedido</h1>
          <p className="text-zinc-600">
            Para {data.clientName}. Se arma con los datos actuales del pedido: si cambias productos, fechas o el anticipo, guarda y vuelve a abrir esta nota.
          </p>
        </div>

        <TicketActions src={src} fileName={`nota-${data.folio}.pdf`} />

        {/* Vista previa del PDF; en algunos celulares no se muestra y basta con "Abrir en otra pestaña" */}
        <iframe src={`${src}#toolbar=0&view=FitH`} title={`Nota de pedido de ${data.clientName}`} className="w-full h-[80vh] rounded-2xl border border-zinc-200/60 bg-white shadow-sm" />
      </main>
    </div>
  );
}
