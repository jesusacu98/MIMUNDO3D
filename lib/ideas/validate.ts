import { IDEAS_LIMITS, type ChatMessage, type IdeaCardData, type IdeaProduct, type MessagePart, type QuoteItem } from './types';

// Sanea lo que manda el navegador. Nada de esto es de fiar (cualquiera puede llamar al endpoint
// con un JSON armado a mano): se revisan tipos y se recortan longitudes antes de usarlo o guardarlo.

const ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export function isValidId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

function sanitizeProduct(value: unknown): IdeaProduct | undefined {
  if (!isRecord(value)) return undefined;
  const id = str(value.id, 64);
  const url = str(value.url, 120);
  if (!id || !url.startsWith('/catalogo/')) return undefined;
  const price = typeof value.price === 'number' && Number.isFinite(value.price) ? value.price : 0;
  return { id, name: str(value.name, 120), price, isStartingPrice: value.isStartingPrice === true, url };
}

function sanitizeIdeas(value: unknown): IdeaCardData[] {
  if (!Array.isArray(value)) return [];
  const ideas: IdeaCardData[] = [];
  for (const item of value.slice(0, 12)) {
    if (!isRecord(item)) continue;
    const title = str(item.title, 80);
    if (!title) continue;
    const product = sanitizeProduct(item.product);
    ideas.push({
      id: str(item.id, 80) || `idea-${ideas.length}`,
      title,
      description: str(item.description, 300),
      ...(product ? { product } : {}),
    });
  }
  return ideas;
}

export type ParsedChatRequest =
  | { ok: true; sessionId: string; assistantId: string; history: ChatMessage[] }
  | { ok: false; status: number; error: string };

export function parseChatRequest(body: unknown): ParsedChatRequest {
  if (!isRecord(body)) return { ok: false, status: 400, error: 'Solicitud inválida.' };
  if (!isValidId(body.sessionId) || !isValidId(body.assistantId)) return { ok: false, status: 400, error: 'Solicitud inválida.' };
  if (!Array.isArray(body.messages) || body.messages.length === 0) return { ok: false, status: 400, error: 'Escribe tu mensaje.' };
  if (body.messages.length > IDEAS_LIMITS.maxTurns * 2) {
    return { ok: false, status: 400, error: 'La conversación es muy larga. Empieza una nueva para seguir.' };
  }

  const history: ChatMessage[] = [];
  for (const raw of body.messages) {
    if (!isRecord(raw) || (raw.role !== 'user' && raw.role !== 'assistant') || !Array.isArray(raw.parts)) {
      return { ok: false, status: 400, error: 'Solicitud inválida.' };
    }
    const parts: MessagePart[] = [];
    for (const part of raw.parts.slice(0, 8)) {
      if (!isRecord(part)) continue;
      if (part.type === 'text') {
        const text = str(part.text, raw.role === 'user' ? IDEAS_LIMITS.maxUserChars : 3000);
        if (text) parts.push({ type: 'text', text });
      } else if (part.type === 'ideas' && raw.role === 'assistant') {
        const ideas = sanitizeIdeas(part.ideas);
        if (ideas.length) parts.push({ type: 'ideas', ideas });
      }
    }
    if (parts.length === 0) continue;
    history.push({ id: str(raw.id, 64) || `m-${history.length}`, role: raw.role, parts });
  }

  const userTurns = history.filter((m) => m.role === 'user').length;
  if (userTurns > IDEAS_LIMITS.maxTurns) {
    return { ok: false, status: 400, error: 'La conversación es muy larga. Empieza una nueva para seguir.' };
  }
  if (history[history.length - 1]?.role !== 'user') return { ok: false, status: 400, error: 'Escribe tu mensaje.' };

  return { ok: true, sessionId: body.sessionId, assistantId: body.assistantId, history };
}

export type ParsedQuoteRequest =
  | { ok: true; sessionId: string; need: string; items: QuoteItem[] }
  | { ok: false; status: number; error: string };

export function parseQuoteRequest(body: unknown): ParsedQuoteRequest {
  if (!isRecord(body) || !isValidId(body.sessionId) || !Array.isArray(body.items)) {
    return { ok: false, status: 400, error: 'Solicitud inválida.' };
  }
  const items: QuoteItem[] = [];
  for (const raw of body.items.slice(0, IDEAS_LIMITS.maxQuoteItems)) {
    if (!isRecord(raw)) continue;
    const title = str(raw.title, 80);
    if (!title) continue;
    const quantity = typeof raw.quantity === 'number' && Number.isFinite(raw.quantity) ? Math.min(999, Math.max(1, Math.round(raw.quantity))) : 1;
    const product = sanitizeProduct(raw.product);
    items.push({
      id: str(raw.id, 80) || `item-${items.length}`,
      title,
      description: str(raw.description, 300),
      quantity,
      note: str(raw.note, IDEAS_LIMITS.maxNoteChars),
      ...(product ? { product } : {}),
      ...(raw.custom === true ? { custom: true } : {}),
    });
  }
  if (items.length === 0) return { ok: false, status: 400, error: 'La lista está vacía.' };
  return { ok: true, sessionId: body.sessionId, need: str(body.need, 200), items };
}
