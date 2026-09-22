import type { ChatMessage, QuoteItem } from './types';

// Persistencia en el navegador (localStorage). Puede fallar o venir vacío (ventana privada,
// datos bloqueados...), así que TODO va en try/catch y la página funciona igual sin esto.

const CHAT_KEY = 'mm3d_ideas_chat_v1';
const QUOTE_KEY = 'mm3d_ideas_quote_v1';

export interface StoredChat {
  sessionId: string;
  messages: ChatMessage[];
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sin almacenamiento disponible: se sigue sin guardar
  }
}

export function newSessionId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Id corto (alfanumérico) para mensajes; cumple el patrón que valida el servidor. */
export function newMessageId(): string {
  return `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function loadChat(): StoredChat | null {
  const stored = read<StoredChat>(CHAT_KEY);
  if (!stored || typeof stored.sessionId !== 'string' || !Array.isArray(stored.messages)) return null;
  return stored;
}

export function saveChat(chat: StoredChat) {
  write(CHAT_KEY, chat);
}

export function loadQuote(): QuoteItem[] {
  const stored = read<QuoteItem[]>(QUOTE_KEY);
  return Array.isArray(stored) ? stored : [];
}

export function saveQuote(items: QuoteItem[]) {
  write(QUOTE_KEY, items);
}
