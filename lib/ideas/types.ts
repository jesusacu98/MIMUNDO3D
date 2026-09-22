// Tipos compartidos entre el servidor y el cliente del chat de ideas (/ideas).
// No importar nada de servidor aquí: lo usan Client Components.

export interface IdeaProduct {
  id: string;
  name: string;
  price: number;
  isStartingPrice: boolean;
  /** Ruta de la ficha en el catálogo, ej. `/catalogo/<id>`. */
  url: string;
}

export interface IdeaCardData {
  /** Único dentro de la conversación (`<mensaje>-<n>`). */
  id: string;
  title: string;
  description: string;
  /** Presente sólo si la idea coincide con un producto real del catálogo. */
  product?: IdeaProduct;
}

export type MessagePart = { type: 'text'; text: string } | { type: 'ideas'; ideas: IdeaCardData[] };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
}

/** Eventos que el servidor manda al navegador (uno por línea, NDJSON). */
export type ChatStreamEvent =
  | { type: 'meta'; demo: boolean }
  | { type: 'text'; delta: string }
  | { type: 'ideas'; ideas: IdeaCardData[] }
  | { type: 'error'; message: string }
  | { type: 'done' };

/** Un elemento de "Mi cotización". */
export interface QuoteItem {
  id: string;
  title: string;
  description: string;
  quantity: number;
  note: string;
  product?: IdeaProduct;
  /** true si el cliente la escribió a mano (idea propia / referencia). */
  custom?: boolean;
}

/** Límites que comparten cliente y servidor. */
export const IDEAS_LIMITS = {
  maxUserChars: 500,
  maxTurns: 20,
  maxNoteChars: 200,
  maxQuoteItems: 30,
} as const;
