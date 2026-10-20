import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { renderOrderTicketPdf } from '@/lib/pedidos/ticket';
import { loadTicketData } from '@/lib/pedidos/loadTicket';

// `proxy.ts` sólo protege `/admin/:path*`, no `/api/*` — se re-verifica el rol acá.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const { id } = await params;

  const data = await loadTicketData(id);
  if (!data) return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });

  const pdf = await renderOrderTicketPdf(data);
  const fileName = `nota-${data.clientName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'pedido'}-${data.folio}.pdf`;
  const download = new URL(request.url).searchParams.get('download') === '1';

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'no-store',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${fileName}"`,
    },
  });
}
