import Anthropic from '@anthropic-ai/sdk';
import type { LlmMessage, LlmProvider, LlmRequest, LlmStopReason, LlmStreamEvent } from './types';

// El modelo siempre llega ya resuelto desde `getLlmProvider()` (ver `lib/ideas/settings.ts` para
// el valor por defecto, `claude-haiku-4-5`) — esta clase no necesita uno propio.

function toAnthropicMessages(messages: LlmMessage[]): Anthropic.MessageParam[] {
  return messages.map((message): Anthropic.MessageParam => {
    if (message.role === 'user') return { role: 'user', content: message.content };

    if (message.role === 'assistant') {
      const content: Anthropic.ContentBlockParam[] = [];
      if (message.text.trim()) content.push({ type: 'text', text: message.text });
      for (const call of message.toolCalls) {
        content.push({ type: 'tool_use', id: call.id, name: call.name, input: call.input });
      }
      return { role: 'assistant', content };
    }

    // Todos los resultados de una misma vuelta van juntos en UN solo mensaje de usuario.
    return {
      role: 'user',
      content: message.results.map(
        (result): Anthropic.ToolResultBlockParam => ({
          type: 'tool_result',
          tool_use_id: result.callId,
          content: result.content,
          ...(result.isError ? { is_error: true } : {}),
        }),
      ),
    };
  });
}

function toStopReason(reason: Anthropic.Message['stop_reason']): LlmStopReason {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'end_turn';
    case 'tool_use':
      return 'tool_use';
    case 'max_tokens':
      return 'max_tokens';
    case 'refusal':
      return 'refusal';
    default:
      return 'other';
  }
}

export class AnthropicProvider implements LlmProvider {
  readonly id = 'anthropic';
  readonly isDemo = false;
  private readonly client: Anthropic;

  constructor(
    private readonly model: string,
    options: { apiKey?: string; baseURL?: string } = {},
  ) {
    // Sin apiKey explícita el SDK toma ANTHROPIC_API_KEY del entorno.
    this.client = new Anthropic({ apiKey: options.apiKey, baseURL: options.baseURL });
  }

  async *stream(request: LlmRequest): AsyncGenerator<LlmStreamEvent> {
    const stream = this.client.messages.stream(
      {
        model: this.model,
        max_tokens: request.maxTokens,
        // El prompt del sistema es idéntico en cada turno: se marca para caché de prompts.
        system: [{ type: 'text', text: request.system, cache_control: { type: 'ephemeral' } }],
        tools: request.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
        })),
        messages: toAnthropicMessages(request.messages),
      },
      { signal: request.signal },
    );

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', delta: event.delta.text };
      }
    }

    const final = await stream.finalMessage();
    for (const block of final.content) {
      if (block.type === 'tool_use') {
        yield {
          type: 'tool_call',
          call: { id: block.id, name: block.name, input: (block.input ?? {}) as Record<string, unknown> },
        };
      }
    }
    yield { type: 'end', reason: toStopReason(final.stop_reason) };
  }
}
