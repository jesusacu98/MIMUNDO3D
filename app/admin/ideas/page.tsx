import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ExternalLink } from 'lucide-react';
import { formatIdeaPrice } from '@/lib/ideas/format';
import type { ChatMessage, QuoteItem } from '@/lib/ideas/types';

interface PageProps {
  searchParams: Promise<{ f?: string }>;
}

const LIST_LIMIT = 100;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mazatlan' });
}

// Los mensajes se guardan como JSON (lo escribió el chat); se lee de forma defensiva.
function asMessages(value: unknown): ChatMessage[] {
  return Array.isArray(value) ? (value as ChatMessage[]).filter((m) => m && Array.isArray(m.parts)) : [];
}
function asQuoteItems(value: unknown): QuoteItem[] {
  return Array.isArray(value) ? (value as QuoteItem[]).filter((i) => i && typeof i.title === 'string') : [];
}
function firstUserText(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user');
  const part = first?.parts.find((p) => p.type === 'text');
  return part && part.type === 'text' ? part.text : '(sin mensaje)';
}

function QuoteItemsList({ items }: { items: QuoteItem[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl bg-zinc-50 px-3 py-2">
          <span className="font-semibold text-zinc-900">
            {item.title}
            {item.quantity > 1 && ` (x${item.quantity})`}
          </span>
          {item.product ? (
            <>
              {' · '}
              <Link href={item.product.url} target="_blank" className="text-primary-dark hover:underline">
                Catálogo {formatIdeaPrice(item.product)}
              </Link>
            </>
          ) : (
            <span className="text-zinc-500">{item.custom ? ` · Idea propia: ${item.description}` : ' · A la medida'}</span>
          )}
          {item.note && <span className="text-zinc-600"> · Nota: {item.note}</span>}
        </li>
      ))}
    </ul>
  );
}

export default async function AdminIdeasPage({ searchParams }: PageProps) {
  const { f } = await searchParams;
  const onlyQuoted = f === 'cotizadas';

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  let query = supabaseAdmin
    .from('idea_conversations')
    .select('id, session_id, messages, quote_sent, quote_items, quote_sent_at, provider, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(LIST_LIMIT);
  if (onlyQuoted) query = query.eq('quote_sent', true);
  const { data, error } = await query;

  const conversations = data ?? [];

  // Enlaces públicos (/cotizacion/<token>) generados por estas conversaciones. Si la tabla aún no
  // existe la consulta falla y simplemente no se muestran (se usa la copia de la conversación).
  const sessionIds = conversations.map((c) => c.session_id);
  const { data: quoteRows } = sessionIds.length
    ? await supabaseAdmin
        .from('idea_quotes')
        .select('token, session_id, items, created_at')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false })
    : { data: [] };
  const quotesBySession = new Map<string, NonNullable<typeof quoteRows>>();
  for (const row of quoteRows ?? []) quotesBySession.set(row.session_id, [...(quotesBySession.get(row.session_id) ?? []), row]);

  const quotedCount = conversations.filter((c) => c.quote_sent).length;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Ideas (chat con IA)</h1>
          <p className="text-zinc-600">
            Lo que piden los clientes en <span className="font-medium">/ideas</span> y las listas que mandaron a cotizar por WhatsApp. Es solo consulta: los
            pedidos se siguen levantando a mano desde <Link href="/admin/pedidos" className="underline hover:text-primary">Pedidos</Link>.
          </p>
        </div>

        {error && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
            No se pudieron leer las conversaciones ({error.message}). Si es la primera vez, corre <code className="font-mono">supabase/schema_ideas.sql</code> en el
            SQL Editor de Supabase y confirma que <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> está configurada.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-1 text-sm font-medium">
            <Link href="/admin/ideas" className={`rounded-lg px-4 py-1.5 ${!onlyQuoted ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:text-zinc-950'}`}>
              Todas
            </Link>
            <Link
              href="/admin/ideas?f=cotizadas"
              className={`rounded-lg px-4 py-1.5 ${onlyQuoted ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:text-zinc-950'}`}
            >
              Enviadas a cotizar
            </Link>
          </div>
          <p className="text-sm text-zinc-500">
            {conversations.length} conversación(es){!onlyQuoted && ` · ${quotedCount} enviada(s) a cotizar`}
            {conversations.length === LIST_LIMIT && ` (últimas ${LIST_LIMIT})`}
          </p>
        </div>

        {!error && conversations.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center text-sm text-zinc-500">
            {onlyQuoted ? 'Todavía nadie ha enviado una lista a cotizar.' : 'Aún no hay conversaciones registradas.'}
          </p>
        )}

        <div className="space-y-3">
          {conversations.map((conversation) => {
            const messages = asMessages(conversation.messages);
            const items = asQuoteItems(conversation.quote_items);
            const userTurns = messages.filter((m) => m.role === 'user').length;
            const quotes = quotesBySession.get(conversation.session_id) ?? [];

            return (
              <details key={conversation.id} className="group bg-white border border-zinc-200/60 rounded-2xl open:shadow-sm">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-950 line-clamp-2">&ldquo;{firstUserText(messages)}&rdquo;</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatDateTime(conversation.updated_at)} · {userTurns} mensaje(s) del cliente
                      {conversation.provider === 'mock' && ' · demostración'}
                    </p>
                  </div>
                  {conversation.quote_sent ? (
                    <span className="shrink-0 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-500/20">
                      Enviada a cotizar{items.length > 0 && ` · ${items.length} idea(s)`}
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">Solo consulta</span>
                  )}
                </summary>

                <div className="border-t border-zinc-100 px-5 py-4 space-y-5">
                  {quotes.length > 0 ? (
                    quotes.map((quote) => {
                      const quoteItems = asQuoteItems(quote.items);
                      return (
                        <div key={quote.token}>
                          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                              Enviada a cotizar · {formatDateTime(quote.created_at)}
                            </h2>
                            <Link
                              href={`/cotizacion/${quote.token}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary-dark hover:underline"
                            >
                              Abrir enlace
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                          <QuoteItemsList items={quoteItems} />
                        </div>
                      );
                    })
                  ) : (
                    conversation.quote_sent &&
                    items.length > 0 && (
                      <div>
                        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                          Lo que mandó a cotizar{conversation.quote_sent_at && ` · ${formatDateTime(conversation.quote_sent_at)}`}
                        </h2>
                        <QuoteItemsList items={items} />
                      </div>
                    )
                  )}

                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Conversación</h2>
                    <div className="space-y-3 text-sm">
                      {messages.map((message) => (
                        <div key={message.id} className={message.role === 'user' ? 'text-right' : ''}>
                          <div
                            className={`inline-block max-w-full rounded-2xl px-3.5 py-2 text-left ${
                              message.role === 'user' ? 'bg-primary/10 text-zinc-900' : 'bg-zinc-100 text-zinc-800'
                            }`}
                          >
                            {message.parts.map((part, index) =>
                              part.type === 'text' ? (
                                <p key={index} className="whitespace-pre-line">
                                  {part.text}
                                </p>
                              ) : (
                                <p key={index} className="mt-1 text-xs text-zinc-500">
                                  Ideas mostradas: {part.ideas.map((i) => (i.product ? `${i.title} (catálogo)` : i.title)).join(' · ')}
                                </p>
                              ),
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </main>
    </div>
  );
}
