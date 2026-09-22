// Contrato mínimo entre el chat de ideas y el modelo de lenguaje.
//
// Todo el sistema (orquestador, herramientas, UI) habla SOLO con estos tipos. Para
// cambiar de LLM (OpenAI, Gemini, un modelo local...) basta con escribir otra clase
// que implemente `LlmProvider` y registrarla en `./index.ts`; nada más cambia.
//
// Los mensajes usan un formato neutro (el de "llamadas a herramientas" que comparten
// todos los proveedores) y cada proveedor lo traduce a su API.

export interface LlmToolDef {
  name: string;
  description: string;
  /** JSON Schema del input de la herramienta. */
  inputSchema: Record<string, unknown>;
}

export interface LlmToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LlmToolResult {
  callId: string;
  name: string;
  content: string;
  isError?: boolean;
}

export type LlmMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; text: string; toolCalls: LlmToolCall[] }
  | { role: 'tool'; results: LlmToolResult[] };

export type LlmStopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'refusal' | 'other';

export type LlmStreamEvent =
  | { type: 'text'; delta: string }
  /** Se emite completa (con su input ya armado) cuando el modelo termina de pedirla. */
  | { type: 'tool_call'; call: LlmToolCall }
  | { type: 'end'; reason: LlmStopReason };

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  tools: LlmToolDef[];
  maxTokens: number;
  signal?: AbortSignal;
}

export interface LlmProvider {
  /** Identificador corto que se guarda con la conversación ('anthropic', 'mock'...). */
  readonly id: string;
  /** true si las respuestas son simuladas (la UI muestra el aviso "modo demostración"). */
  readonly isDemo: boolean;
  /**
   * Una vuelta del modelo: emite texto a medida que llega, las llamadas a herramientas
   * completas y al final un `end`. Ejecutar las herramientas y volver a llamar es
   * trabajo del orquestador (`../chat.ts`), no del proveedor.
   */
  stream(request: LlmRequest): AsyncGenerator<LlmStreamEvent>;
}
