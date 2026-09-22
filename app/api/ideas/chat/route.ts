import { runIdeasChat } from '@/lib/ideas/chat';
import { getLlmProvider } from '@/lib/ideas/llm';
import { MockProvider } from '@/lib/ideas/llm/mock';
import { applyStreamEvent } from '@/lib/ideas/parts';
import { clientIp, consumeGlobalBudget, consumeRateLimit, hashIp, saveConversation } from '@/lib/ideas/persistence';
import { getIdeaSettings } from '@/lib/ideas/settings';
import type { ChatMessage, ChatStreamEvent, MessagePart } from '@/lib/ideas/types';
import { parseChatRequest } from '@/lib/ideas/validate';

// Las respuestas del modelo se emiten por streaming; damos margen para varias vueltas de herramientas.
export const maxDuration = 60;

const encoder = new TextEncoder();
const line = (event: ChatStreamEvent) => encoder.encode(`${JSON.stringify(event)}\n`);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const parsed = parseChatRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: parsed.status });

  // Una sola lectura de configuración por request (cacheada ~20s en lib/ideas/settings.ts);
  // de aquí salen el proveedor de IA, si usa catálogo y los dos límites de uso.
  const settings = await getIdeaSettings();

  const allowed = await consumeRateLimit(hashIp(clientIp(request)), settings.rateLimitPerHour);
  if (!allowed) {
    return Response.json(
      { error: 'Has enviado muchos mensajes seguidos. Espera un rato y vuelve a intentarlo, o escríbenos por WhatsApp.' },
      { status: 429 },
    );
  }

  let provider = getLlmProvider(settings);
  // Techo global (todos los visitantes juntos): si ya se alcanzó, esta respuesta se sirve con la
  // simulación en vez del proveedor real. El chat nunca se corta, sólo deja de gastar — protege
  // contra un ataque repartido entre muchas IPs, que el límite por IP de arriba no frena solo.
  if (!provider.isDemo && !(await consumeGlobalBudget(settings.globalRateLimitPerHour, settings.globalRateLimitPerDay))) {
    provider = new MockProvider();
  }

  const useCatalog = settings.useCatalog;
  const abort = new AbortController();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let parts: MessagePart[] = [];
      let finished = false;
      try {
        for await (const event of runIdeasChat({
          history: parsed.history,
          provider,
          useCatalog,
          messageId: parsed.assistantId,
          signal: abort.signal,
        })) {
          parts = applyStreamEvent(parts, event);
          finished = finished || event.type === 'done';
          controller.enqueue(line(event));
        }
      } catch (error) {
        console.error('[ideas] Error en el stream del chat:', error);
        controller.enqueue(line({ type: 'error', message: 'No pude responder en este momento. Inténtalo de nuevo en unos segundos.' }));
      }

      // Guarda la conversación (para /admin/ideas) cuando la respuesta terminó bien.
      if (finished && parts.length > 0 && !abort.signal.aborted) {
        const assistant: ChatMessage = { id: parsed.assistantId, role: 'assistant', parts };
        await saveConversation({ sessionId: parsed.sessionId, messages: [...parsed.history, assistant], provider: provider.id });
      }
      try {
        controller.close();
      } catch {
        // el cliente ya cerró la conexión
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
