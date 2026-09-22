import { formatIdeaPrice } from './format';
import type { QuoteItem } from './types';

// Mismo número que usan el footer del catálogo y la ficha de producto.
export const WHATSAPP_NUMBER = '526691224168';

// Los links de wa.me con textos muy largos fallan en algunos dispositivos: se recorta la lista.
const MAX_MESSAGE_CHARS = 1800;

/** Una línea por idea: cantidad, enlace al producto si es del catálogo, y nota. */
export function formatQuoteLine(item: QuoteItem, index: number, origin: string): string {
  const quantity = item.quantity > 1 ? ` (x${item.quantity})` : '';
  const parts: string[] = [];
  if (item.custom) {
    parts.push(`${index + 1}. Idea propia${quantity}: ${item.description}`);
  } else if (item.product) {
    parts.push(`${index + 1}. ${item.title}${quantity}`, `Catálogo: ${origin}${item.product.url} (${formatIdeaPrice(item.product)})`);
  } else {
    parts.push(`${index + 1}. ${item.title}${quantity}`, 'A la medida');
  }
  if (item.note) parts.push(`Nota: ${item.note}`);
  return parts.join(' — ');
}

/**
 * Mensaje corto para WhatsApp cuando la lista quedó guardada en un enlace: la necesidad, cuántas
 * ideas son y el enlace. Si el enlace fallara, el resumen sigue diciendo qué quiere el cliente.
 */
export function buildQuoteLinkMessage(input: { need: string; count: number; url: string }): string {
  const ideas = `${input.count} idea${input.count === 1 ? '' : 's'}`;
  return [
    `¡Hola, MiMundo3D! 👋 Quiero cotizar ${ideas}${input.need ? ` para: "${input.need}"` : ''}.`,
    `Mi lista: ${input.url}`,
  ].join('\n');
}

/**
 * Mensaje COMPLETO (respaldo, si no se pudo generar el enlace). WhatsApp no permite adjuntar imágenes
 * por enlace, así que va todo en texto y se recorta si la lista es muy larga.
 */
export function buildQuoteMessage(input: { need: string; items: QuoteItem[]; origin: string }): { text: string; omitted: number } {
  const header = `¡Hola, MiMundo3D! 👋 Quiero cotizar estas ideas${input.need ? ` para: "${input.need}"` : ''}:`;
  const footer = '¿Me pueden cotizar?';
  const lines = input.items.map((item, index) => formatQuoteLine(item, index, input.origin));

  let text = header;
  let included = 0;
  for (const line of lines) {
    const candidate = `${text}\n${line}`;
    // Deja espacio para el aviso de recorte y el cierre.
    if (candidate.length + footer.length + 60 > MAX_MESSAGE_CHARS && included > 0) break;
    text = candidate;
    included += 1;
  }
  const omitted = lines.length - included;
  if (omitted > 0) text += `\n(+${omitted} idea${omitted === 1 ? '' : 's'} más: te las paso por este chat)`;
  return { text: `${text}\n${footer}`, omitted };
}

/** Resumen en texto plano de una cotización completa (botón "Copiar resumen" de la página del enlace). */
export function buildQuoteSummary(input: { need: string; items: QuoteItem[]; origin: string }): string {
  const lines = input.items.map((item, index) => formatQuoteLine(item, index, input.origin));
  return [input.need ? `Necesidad: ${input.need}` : '', ...lines].filter(Boolean).join('\n');
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
