import { createHmac, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { ChatMessage, QuoteItem } from './types';

// Límite de uso y registro de conversaciones del chat de ideas (tablas de supabase/schema_ideas.sql).
//
// Todo es "de mejor esfuerzo": si falta la service role key o las tablas todavía no se crearon en
// Supabase, se avisa UNA vez en consola y el chat sigue funcionando (sin límite ni historial).
// Nada de esto toca `orders`: las cotizaciones se siguen levantando a mano desde WhatsApp.

// Los límites (por IP y el techo global) ya no son constantes fijas: los decide quien llama, con
// el valor configurado en /admin/ideas/configuracion (ver lib/ideas/settings.ts). Este archivo
// sólo sabe contar y comparar contra el número que le pasen.
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Marca reservada: nunca choca con un ip_hash real (que siempre son 32 caracteres hexadecimales).
const GLOBAL_MARKER = '__global__';

const isConfigured = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const warned = new Set<string>();
function warnOnce(scope: string, message: string) {
  if (warned.has(scope)) return;
  warned.add(scope);
  console.warn(`[ideas] ${scope}: ${message}`);
}

// Para no llenar los logs: avisa cuando se activa el techo global y de nuevo cuando se libera,
// no en cada mensaje mientras siga activo.
let globalLimitActive = false;

/** Hash de la IP (HMAC con la service role key): sirve para contar sin guardar la IP en claro. */
export function hashIp(ip: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mimundo3d-ideas';
  return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 32);
}

export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** Cuenta este mensaje y dice si el cliente aún está dentro del límite por hora. */
export async function consumeRateLimit(ipHash: string, limitPerHour: number): Promise<boolean> {
  if (!isConfigured()) return true;
  try {
    const since = new Date(Date.now() - HOUR_MS).toISOString();
    const { count, error } = await supabaseAdmin
      .from('idea_chat_log')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', since);
    if (error) throw error;
    if ((count ?? 0) >= limitPerHour) return false;

    const { error: insertError } = await supabaseAdmin.from('idea_chat_log').insert({ ip_hash: ipHash });
    if (insertError) throw insertError;

    // Limpieza ocasional para que la tabla no crezca sin fin.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - 2 * 24 * HOUR_MS).toISOString();
      await supabaseAdmin.from('idea_chat_log').delete().lt('created_at', cutoff);
    }
    return true;
  } catch (error) {
    warnOnce('límite de uso', `no disponible (¿corriste supabase/schema_ideas.sql?): ${describe(error)}`);
    return true;
  }
}

/**
 * Techo global: ¿todavía hay margen para atender este mensaje con el proveedor REAL de IA? Si se
 * supera, el llamador debe usar la simulación en vez del proveedor real — nunca cortar el chat, así
 * el sitio nunca se ve caído, sólo deja de gastar. Se llama sólo cuando el proveedor no es demo
 * (`persistence` no sabe qué proveedor es; eso lo decide `app/api/ideas/chat/route.ts`).
 */
export async function consumeGlobalBudget(limitPerHour: number, limitPerDay: number): Promise<boolean> {
  if (!isConfigured()) return true;
  try {
    const now = Date.now();
    const [hour, day] = await Promise.all([
      supabaseAdmin
        .from('idea_chat_log')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', GLOBAL_MARKER)
        .gte('created_at', new Date(now - HOUR_MS).toISOString()),
      supabaseAdmin
        .from('idea_chat_log')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', GLOBAL_MARKER)
        .gte('created_at', new Date(now - DAY_MS).toISOString()),
    ]);
    if (hour.error) throw hour.error;
    if (day.error) throw day.error;

    if ((hour.count ?? 0) >= limitPerHour || (day.count ?? 0) >= limitPerDay) {
      if (!globalLimitActive) {
        globalLimitActive = true;
        console.warn(
          `[ideas] Techo global alcanzado (hora: ${hour.count}/${limitPerHour}, día: ${day.count}/${limitPerDay}). ` +
            'El chat sigue respondiendo en modo demostración hasta que baje la demanda.',
        );
      }
      return false;
    }

    if (globalLimitActive) {
      globalLimitActive = false;
      console.warn('[ideas] Techo global liberado: el chat vuelve a usar el proveedor real de IA.');
    }
    const { error: insertError } = await supabaseAdmin.from('idea_chat_log').insert({ ip_hash: GLOBAL_MARKER });
    if (insertError) throw insertError;
    return true;
  } catch (error) {
    warnOnce('techo global', `no disponible (¿corriste supabase/schema_ideas.sql?): ${describe(error)}`);
    return true; // falla abierto, igual que el límite por IP (ver nota al inicio del archivo)
  }
}

export async function saveConversation(input: { sessionId: string; messages: ChatMessage[]; provider: string }): Promise<void> {
  if (!isConfigured()) return;
  try {
    const { error } = await supabaseAdmin
      .from('idea_conversations')
      .upsert(
        { session_id: input.sessionId, messages: input.messages, provider: input.provider },
        { onConflict: 'session_id' },
      );
    if (error) throw error;
  } catch (error) {
    warnOnce('guardar conversación', `no disponible (¿corriste supabase/schema_ideas.sql?): ${describe(error)}`);
  }
}

/** Marca que el cliente mandó su lista a cotizar por WhatsApp (guarda un snapshot de la lista). */
export async function markQuoteSent(input: { sessionId: string; items: QuoteItem[] }): Promise<void> {
  if (!isConfigured()) return;
  try {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('idea_conversations')
      .upsert(
        { session_id: input.sessionId, quote_sent: true, quote_items: input.items, quote_sent_at: now },
        { onConflict: 'session_id' },
      );
    if (error) throw error;
  } catch (error) {
    warnOnce('registrar cotización', `no disponible (¿corriste supabase/schema_ideas.sql?): ${describe(error)}`);
  }
}

export interface StoredQuote {
  token: string;
  need: string;
  items: QuoteItem[];
  createdAt: string;
}

/** Los tokens que genera `createQuote`: 16 bytes en base64url = 22 caracteres. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/**
 * Guarda una copia de la lista y devuelve el token del enlace público (`/cotizacion/<token>`, sin
 * vencimiento). `null` si no se pudo (tabla ausente, Supabase caído...): el cliente entonces manda
 * el mensaje completo por WhatsApp y no se pierde la cotización.
 */
export async function createQuote(input: { sessionId: string; need: string; items: QuoteItem[] }): Promise<{ token: string } | null> {
  if (!isConfigured()) return null;
  try {
    const token = randomBytes(16).toString('base64url');
    const { error } = await supabaseAdmin
      .from('idea_quotes')
      .insert({ token, session_id: input.sessionId, need: input.need, items: input.items });
    if (error) throw error;
    return { token };
  } catch (error) {
    warnOnce('crear enlace de cotización', `no disponible (¿corriste supabase/schema_ideas.sql?): ${describe(error)}`);
    return null;
  }
}

/** Busca una cotización por su token exacto. `null` si el token no tiene la forma correcta o no existe. */
export async function getQuoteByToken(token: string): Promise<StoredQuote | null> {
  if (!isConfigured() || !TOKEN_PATTERN.test(token)) return null;
  try {
    const { data, error } = await supabaseAdmin
      .from('idea_quotes')
      .select('token, need, items, created_at')
      .eq('token', token)
      .limit(1);
    if (error) throw error;
    const row = data?.[0];
    if (!row) return null;
    return {
      token: row.token,
      need: row.need,
      items: Array.isArray(row.items) ? (row.items as QuoteItem[]) : [],
      createdAt: row.created_at,
    };
  } catch (error) {
    warnOnce('leer cotización', `no disponible: ${describe(error)}`);
    return null;
  }
}

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return String(error);
}
