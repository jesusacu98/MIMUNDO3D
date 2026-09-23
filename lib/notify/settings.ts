import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Configuración del aviso por correo cuando falla una llamada a IA, editable desde
// /admin/notificaciones (tabla `notify_settings`, ver supabase/schema_notify.sql). Mismo criterio
// que la configuración del chat de ideas (lib/ideas/settings.ts): no vive en variables de entorno
// a propósito, para poder reconfigurarse desde el navegador y aplicar al instante, sin redeploy.
//
// La contraseña SMTP NUNCA debe pasarse a un Client Component ni a un Server Action devuelto al
// navegador — sólo la usa `notifyAiError()` (lib/notify/email.ts), server-only. Para la pantalla
// del admin, usar `toSafeView()`, que nunca incluye el valor completo.

export interface NotifySettings {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  /** `null` si no hay contraseña guardada → notifyAiError() no intenta mandar nada. */
  smtpPass: string | null;
  /** Correo que recibe los avisos. */
  alertEmail: string | null;
}

const DEFAULTS: NotifySettings = {
  smtpHost: null,
  smtpPort: null,
  smtpUser: null,
  smtpPass: null,
  alertEmail: null,
};

// Corto a propósito, igual que en lib/ideas/settings.ts: los cambios desde el admin deben notarse
// casi de inmediato.
const CACHE_TTL_MS = 20_000;
let cache: { at: number; settings: NotifySettings } | null = null;

const warned = new Set<string>();
function warnOnce(scope: string, message: string) {
  if (warned.has(scope)) return;
  warned.add(scope);
  console.warn(`[notify] ${scope}: ${message}`);
}

/**
 * Lee la configuración actual. Si la tabla no existe todavía o Supabase no responde, cae a los
 * valores por defecto (sin contraseña → no se manda nada) en vez de romper el aviso — mismo
 * criterio de "falla abierto" que `lib/ideas/settings.ts`.
 */
export async function getNotifySettings(): Promise<NotifySettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.settings;
  try {
    const { data, error } = await supabaseAdmin.from('notify_settings').select('key, value');
    if (error) throw error;

    const row = new Map((data ?? []).map((r) => [r.key, r.value ?? undefined]));
    const port = Number(row.get('smtp_port'));
    const settings: NotifySettings = {
      smtpHost: row.get('smtp_host')?.trim() || null,
      smtpPort: Number.isFinite(port) && port > 0 ? port : null,
      smtpUser: row.get('smtp_user')?.trim() || null,
      smtpPass: row.get('smtp_pass')?.trim() || null,
      alertEmail: row.get('alert_email')?.trim() || null,
    };
    cache = { at: Date.now(), settings };
    return settings;
  } catch (error) {
    warnOnce('configuración', `no disponible (¿corriste supabase/schema_notify.sql?): ${describe(error)}. Usando valores por defecto.`);
    return DEFAULTS;
  }
}

export function invalidateNotifySettingsCache(): void {
  cache = null;
}

/** Vista segura para /admin/notificaciones: nunca incluye la contraseña completa, sólo si existe. */
export interface NotifySettingsView {
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  alertEmail: string | null;
  hasSmtpPass: boolean;
}

export function toSafeView(settings: NotifySettings): NotifySettingsView {
  return {
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    alertEmail: settings.alertEmail,
    hasSmtpPass: Boolean(settings.smtpPass),
  };
}

/** Guarda host, puerto, usuario y correo de aviso (todo menos la contraseña, que tiene su propio flujo). */
export async function updateNotifySettings(input: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  alertEmail: string;
}): Promise<void> {
  const rows = [
    { key: 'smtp_host', value: input.smtpHost },
    { key: 'smtp_port', value: String(input.smtpPort) },
    { key: 'smtp_user', value: input.smtpUser },
    { key: 'alert_email', value: input.alertEmail },
  ];
  const { error } = await supabaseAdmin.from('notify_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
  invalidateNotifySettingsCache();
}

/** `value` guarda/reemplaza la contraseña SMTP; `null` la quita (el aviso deja de intentar mandarse). */
export async function setSmtpPass(value: string | null): Promise<void> {
  const { error } = await supabaseAdmin.from('notify_settings').upsert({ key: 'smtp_pass', value }, { onConflict: 'key' });
  if (error) throw error;
  invalidateNotifySettingsCache();
}

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return String(error);
}
