import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarClock, ClipboardList, ExternalLink, LinkIcon, Store, Wand2 } from 'lucide-react';
import { formatIdeaPrice } from '@/lib/ideas/format';
import { getQuoteByToken } from '@/lib/ideas/persistence';
import CopySummaryButton from './CopySummaryButton';

// Enlace público de sólo lectura con la lista que un cliente mandó a cotizar (no vence).
// La única protección es el token aleatorio de la URL (mismo criterio que /pago/[client_id]),
// así que no se indexa ni se cachea.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Lista para cotizar | MiMundo3D',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { dateStyle: 'long', timeZone: 'America/Mazatlan' });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200/80 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
          <Link href="/" aria-label="MiMundo3D, ir al inicio">
            <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-6 w-auto sm:h-8" priority />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Shell>
      <div className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-12 text-center shadow-sm">
        <LinkIcon className="mx-auto mb-4 h-8 w-8 text-zinc-300" />
        <h1 className="text-xl font-bold text-zinc-950">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">{children}</p>
      </div>
    </Shell>
  );
}

export default async function QuotePage({ params }: PageProps) {
  const { token } = await params;
  const quote = await getQuoteByToken(token);

  if (!quote) {
    return <Notice title="Este enlace no es válido">Revisa que esté completo o pide que te lo envíen de nuevo.</Notice>;
  }

  return (
    <Shell>
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-dark ring-1 ring-primary/20">
          <ClipboardList className="h-3.5 w-3.5" />
          Lista para cotizar
        </span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950">
          {quote.items.length} idea{quote.items.length === 1 ? '' : 's'} para cotizar
        </h1>
        <p className="mt-2 flex items-start gap-2 text-sm text-zinc-500">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Creada el {formatDate(quote.createdAt)}</span>
        </p>
      </div>

      {quote.need && (
        <div className="mb-6 rounded-2xl border border-zinc-200/80 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Lo que necesita el cliente</p>
          <p className="mt-1.5 whitespace-pre-line break-words text-zinc-900">&ldquo;{quote.need}&rdquo;</p>
        </div>
      )}

      <ol className="space-y-3">
        {quote.items.map((item, index) => (
          <li key={item.id} className="rounded-2xl border border-zinc-200/80 bg-white p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-bold text-white">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-950">{item.custom ? 'Idea propia del cliente' : item.title}</h2>
                  {item.quantity > 1 && (
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">x{item.quantity}</span>
                  )}
                  {item.product ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-500/20">
                      <Store className="h-3 w-3" />
                      En catálogo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary-dark ring-1 ring-primary/20">
                      <Wand2 className="h-3 w-3" />
                      {item.custom ? 'Referencia' : 'A la medida'}
                    </span>
                  )}
                </div>

                {item.description && <p className="mt-1.5 whitespace-pre-line break-words text-sm text-zinc-600">{item.description}</p>}

                {item.product && (
                  <Link
                    href={item.product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark hover:underline"
                  >
                    {formatIdeaPrice(item.product)} · Ver ficha en el catálogo
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}

                {item.note && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200/70">
                    <span className="font-semibold">Nota del cliente:</span> {item.note}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 sm:flex-row sm:items-center">
        <p className="text-sm text-zinc-500">Lista de solo lectura. Los precios y detalles finales se confirman al cotizar.</p>
        <CopySummaryButton need={quote.need} items={quote.items} />
      </div>
    </Shell>
  );
}
