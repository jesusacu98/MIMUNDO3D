import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendOwnerEmail } from '@/lib/notify/email';
import { inspectToken } from './meta';
import type { SocialSettings } from './settings';

// Estado de la conexión con Meta. El token de la Página no vence, pero Meta fija una «fecha de
// acceso a datos» (~90 días desde que se autorizó la app) tras la cual puede pedir volver a
// autorizar. Se lee de Meta en vivo (debug_token) para mostrarla y avisar antes de que llegue.

export interface ConnectionHealth {
  /** `null` = no se pudo consultar a Meta (no se asume que esté mal). */
  valid: boolean | null;
  dataAccessExpiresAt: string | null;
  daysLeft: number | null;
}

/** A partir de cuántos días se avisa en pantalla y por correo. */
export const WARN_DAYS = 30;
export const EMAIL_DAYS = 14;
const EMAIL_EVERY_MS = 3 * 24 * 60 * 60 * 1000;

let cache: { at: number; token: string; health: ConnectionHealth } | null = null;

export async function getConnectionHealth(settings: SocialSettings): Promise<ConnectionHealth | null> {
  if (!settings.pageToken) return null;
  if (cache && cache.token === settings.pageToken && Date.now() - cache.at < 10 * 60_000) return cache.health;

  let health: ConnectionHealth;
  try {
    const info = await inspectToken(settings.pageToken);
    const expires = info.dataAccessExpiresAt ? new Date(info.dataAccessExpiresAt * 1000) : null;
    health = {
      valid: info.isValid,
      dataAccessExpiresAt: expires ? expires.toISOString() : null,
      daysLeft: expires ? Math.ceil((expires.getTime() - Date.now()) / 86_400_000) : null,
    };
  } catch (error) {
    // Un token revocado hace que debug_token falle con error de OAuth: eso sí es «ya no sirve».
    const message = error instanceof Error ? error.message : '';
    health = { valid: /session|token|oauth|invalid|expired/i.test(message) ? false : null, dataAccessExpiresAt: null, daysLeft: null };
  }
  cache = { at: Date.now(), token: settings.pageToken, health };
  return health;
}

/** ¿Hay que llamar la atención del dueño? */
export function needsAttention(health: ConnectionHealth | null): boolean {
  if (!health) return false;
  return health.valid === false || (health.daysLeft !== null && health.daysLeft <= WARN_DAYS);
}

/**
 * Manda un correo al dueño si la conexión está por vencer (≤14 días) o ya no sirve, como mucho una
 * vez cada 3 días (la marca se guarda en la base de datos porque cada petición puede caer en una
 * instancia distinta). Nunca lanza.
 */
export async function alertIfExpiring(health: ConnectionHealth | null): Promise<void> {
  try {
    if (!health) return;
    const urgent = health.valid === false || (health.daysLeft !== null && health.daysLeft <= EMAIL_DAYS);
    if (!urgent) return;

    const { data } = await supabaseAdmin.from('social_settings').select('value').eq('key', 'expiry_alert_at').maybeSingle();
    const last = data?.value ? new Date(data.value).getTime() : 0;
    if (Date.now() - last < EMAIL_EVERY_MS) return;

    const fecha = health.dataAccessExpiresAt
      ? new Date(health.dataAccessExpiresAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mazatlan' })
      : null;
    const subject = health.valid === false ? '⚠️ MIMUNDO3D: la conexión con Instagram/Facebook ya no es válida' : '⏰ MIMUNDO3D: reconecta Instagram/Facebook pronto';
    const text =
      health.valid === false
        ? 'Meta ya no acepta la conexión con tu Página, así que no se podrá publicar desde el admin.\n\nEntra a /admin/redes y vuelve a conectar (toma unos minutos).'
        : `Meta pide volver a autorizar la app cada ~90 días. Tu conexión llega a esa fecha el ${fecha} (faltan ${health.daysLeft} días).\n\nEntra a /admin/redes y vuelve a conectar antes de esa fecha para que no se corte la publicación directa.`;

    if (await sendOwnerEmail(subject, text)) {
      await supabaseAdmin.from('social_settings').upsert({ key: 'expiry_alert_at', value: new Date().toISOString() }, { onConflict: 'key' });
    }
  } catch (error) {
    console.error('[social] No se pudo revisar/avisar el vencimiento:', error);
  }
}
