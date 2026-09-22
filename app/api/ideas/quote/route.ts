import { clientIp, consumeRateLimit, createQuote, hashIp, markQuoteSent } from '@/lib/ideas/persistence';
import { getIdeaSettings } from '@/lib/ideas/settings';
import { parseQuoteRequest } from '@/lib/ideas/validate';

// El cliente llama aquí al pulsar "Enviar a cotizar": se guarda una copia de su lista y se genera un
// enlace público de sólo lectura (/cotizacion/<token>, sin vencimiento) para mandar por WhatsApp.
// NO crea pedidos: eso sigue siendo manual. Si no se puede generar el enlace responde `token: null`
// y el cliente manda el mensaje completo, así nunca se pierde una cotización.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const parsed = parseQuoteRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status });

  const settings = await getIdeaSettings();
  if (!(await consumeRateLimit(hashIp(clientIp(request)), settings.rateLimitPerHour))) {
    return Response.json({ error: 'Demasiadas solicitudes.' }, { status: 429 });
  }

  const [quote] = await Promise.all([
    createQuote({ sessionId: parsed.sessionId, need: parsed.need, items: parsed.items }),
    markQuoteSent({ sessionId: parsed.sessionId, items: parsed.items }),
  ]);

  return Response.json({ token: quote?.token ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}
