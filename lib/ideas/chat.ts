import type { LlmMessage, LlmProvider, LlmToolCall } from './llm/types';
import { buildSystemPrompt } from './systemPrompt';
import { executeTool, SEARCH_CATALOG_TOOL, SHOW_IDEAS_TOOL } from './tools';
import { textOf } from './parts';
import type { ChatMessage, ChatStreamEvent } from './types';
import { notifyAiError } from '@/lib/notify/email';

// Orquestador del chat: conversa con el proveedor de IA, ejecuta las herramientas que pide y
// convierte todo en eventos para el navegador. No conoce a ningún proveedor concreto: sólo
// habla con la interfaz `LlmProvider`.

const MAX_STEPS = 4; // vueltas modelo → herramientas → modelo por cada mensaje del cliente
const MAX_OUTPUT_TOKENS = 1500;
const FRIENDLY_ERROR = 'No pude responder en este momento. Inténtalo de nuevo en unos segundos.';

/** Historial del navegador → mensajes neutros para el modelo (las tarjetas se resumen en texto). */
export function toLlmMessages(history: ChatMessage[]): LlmMessage[] {
  return history.map((message): LlmMessage => {
    if (message.role === 'user') return { role: 'user', content: textOf(message.parts) };

    const shown = message.parts.flatMap((p) => (p.type === 'ideas' ? p.ideas.map((i) => i.title) : []));
    const text = [textOf(message.parts), shown.length ? `[Tarjetas de ideas mostradas al cliente: ${shown.join('; ')}]` : '']
      .filter(Boolean)
      .join('\n\n');
    return { role: 'assistant', text, toolCalls: [] };
  });
}

export interface RunChatOptions {
  history: ChatMessage[];
  provider: LlmProvider;
  useCatalog: boolean;
  /** Prefijo de los ids de tarjeta (único por mensaje). */
  messageId: string;
  signal?: AbortSignal;
}

export async function* runIdeasChat(options: RunChatOptions): AsyncGenerator<ChatStreamEvent> {
  const { provider, useCatalog, messageId, signal } = options;
  yield { type: 'meta', demo: provider.isDemo };

  const messages = toLlmMessages(options.history);
  const tools = useCatalog ? [SEARCH_CATALOG_TOOL, SHOW_IDEAS_TOOL] : [SHOW_IDEAS_TOOL];
  const system = buildSystemPrompt(useCatalog);

  let producedContent = false;
  let lastPartWasText = false;
  let cardCount = 0;

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      let text = '';
      const calls: LlmToolCall[] = [];
      let stopReason = 'end_turn';

      for await (const event of provider.stream({ system, messages, tools, maxTokens: MAX_OUTPUT_TOKENS, signal })) {
        if (event.type === 'text') {
          // Si el texto sigue a otro texto de una vuelta anterior, se separa con un párrafo.
          const delta = lastPartWasText && text === '' ? `\n\n${event.delta}` : event.delta;
          text += event.delta;
          if (event.delta.trim() !== '') {
            producedContent = true;
            lastPartWasText = true;
          }
          yield { type: 'text', delta };
        } else if (event.type === 'tool_call') {
          calls.push(event.call);
        } else {
          stopReason = event.reason;
        }
      }

      if (calls.length === 0) {
        if (!producedContent || stopReason === 'refusal') yield { type: 'error', message: FRIENDLY_ERROR };
        break;
      }

      messages.push({ role: 'assistant', text, toolCalls: calls });
      const results = [];
      for (const call of calls) {
        const execution = await executeTool(call, { useCatalog, cardIdPrefix: `${messageId}-${cardCount}` });
        if (execution.ideas) {
          cardCount += 1;
          producedContent = true;
          lastPartWasText = false;
          yield { type: 'ideas', ideas: execution.ideas };
        }
        results.push(execution.result);
      }
      messages.push({ role: 'tool', results });
    }
  } catch (error) {
    if (signal?.aborted) return; // el cliente cerró la conexión: no hay a quién avisar
    console.error('[ideas] Error del proveedor de IA:', error);
    void notifyAiError('ideas', error);
    yield { type: 'error', message: FRIENDLY_ERROR };
    return;
  }

  yield { type: 'done' };
}
