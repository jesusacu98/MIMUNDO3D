import OpenAI from 'openai';
import type { LlmMessage, LlmProvider, LlmRequest, LlmStopReason, LlmStreamEvent } from './types';

// El modelo siempre llega ya resuelto desde `getLlmProvider()` (ver `lib/ideas/settings.ts`) —
// esta clase no necesita uno propio.

// El paquete `openai` no reexporta los tipos internos de la Responses API (`ResponseInputItem`,
// `Tool`...) fuera de `openai/resources/...`, una ruta que su propio `package.json` no permite
// importar con `moduleResolution: "bundler"`. Se arman estos ítems como `any[]`; el propio
// `.stream()` valida la forma en runtime contra la API real.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toResponseInput(messages: LlmMessage[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      items.push({ role: 'user', content: message.content });
      continue;
    }

    if (message.role === 'assistant') {
      if (message.text.trim()) items.push({ role: 'assistant', content: message.text });
      for (const call of message.toolCalls) {
        items.push({ type: 'function_call', call_id: call.id, name: call.name, arguments: JSON.stringify(call.input) });
      }
      continue;
    }

    // Todos los resultados de una misma vuelta van como ítems `function_call_output` separados,
    // cada uno referenciando el `call_id` del `function_call` que responde.
    for (const result of message.results) {
      items.push({
        type: 'function_call_output',
        call_id: result.callId,
        output: result.isError ? `Error: ${result.content}` : result.content,
      });
    }
  }
  return items;
}

export class OpenAIProvider implements LlmProvider {
  readonly id = 'openai';
  readonly isDemo = false;
  private readonly client: OpenAI;

  constructor(
    private readonly model: string,
    options: { apiKey?: string; baseURL?: string } = {},
  ) {
    // Sin apiKey explícita el SDK toma OPENAI_API_KEY del entorno.
    this.client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
  }

  async *stream(request: LlmRequest): AsyncGenerator<LlmStreamEvent> {
    const responseStream = this.client.responses.stream(
      {
        model: this.model,
        instructions: request.system,
        input: toResponseInput(request.messages),
        tools: request.tools.map((tool) => ({
          type: 'function',
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
          strict: false,
        })),
        max_output_tokens: request.maxTokens,
      },
      { signal: request.signal },
    );

    for await (const event of responseStream) {
      if (event.type === 'response.output_text.delta') {
        yield { type: 'text', delta: event.delta };
      }
    }

    const final = await responseStream.finalResponse();

    let reason: LlmStopReason = 'end_turn';
    for (const item of final.output) {
      if (item.type === 'function_call') {
        reason = 'tool_use';
        yield {
          type: 'tool_call',
          call: { id: item.call_id, name: item.name, input: JSON.parse(item.arguments || '{}') as Record<string, unknown> },
        };
      }
    }
    if (reason !== 'tool_use' && final.status === 'incomplete') {
      reason = final.incomplete_details?.reason === 'max_output_tokens' ? 'max_tokens' : 'other';
    }
    yield { type: 'end', reason };
  }
}
