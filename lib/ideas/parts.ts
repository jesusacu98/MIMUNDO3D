import type { ChatStreamEvent, MessagePart } from './types';

/**
 * Aplica un evento del stream al mensaje del asistente en construcción. Lo usan por igual el
 * navegador (para pintar el chat) y el servidor (para guardar la conversación), así que ambos
 * ven exactamente lo mismo. Devuelve un arreglo nuevo (sin mutar el original).
 */
export function applyStreamEvent(parts: MessagePart[], event: ChatStreamEvent): MessagePart[] {
  if (event.type === 'text') {
    const last = parts[parts.length - 1];
    if (last?.type === 'text') return [...parts.slice(0, -1), { type: 'text', text: last.text + event.delta }];
    return [...parts, { type: 'text', text: event.delta }];
  }
  if (event.type === 'ideas') return [...parts, { type: 'ideas', ideas: event.ideas }];
  return parts;
}

/** Texto plano de un mensaje (sin las tarjetas). */
export function textOf(parts: MessagePart[]): string {
  return parts
    .flatMap((p) => (p.type === 'text' ? [p.text] : []))
    .join('\n\n')
    .trim();
}
