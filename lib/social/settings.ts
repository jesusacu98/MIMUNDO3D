import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { missingPermissions } from './permissions';

// Conexión con Meta (Página de Facebook + cuenta de Instagram), editable desde /admin/redes
// (tabla `social_settings`, ver supabase/schema_social.sql). Mismo criterio que
// lib/notify/settings.ts: no vive en variables de entorno, se administra desde el navegador y
// aplica al instante.
//
// El token de la Página NUNCA debe pasarse a un Client Component: sólo lo usa lib/social/meta.ts
// (server-only). Para pantallas del admin usar `toSafeView()`. El App Secret ni siquiera se guarda:
// sólo se usa en el momento de conectar.

export interface SocialSettings {
  pageId: string | null;
  pageName: string | null;
  /** Token de la Página: no vence si se obtuvo de un token de usuario de larga duración. */
  pageToken: string | null;
  igUserId: string | null;
  igUsername: string | null;
  appId: string | null;
  connectedAt: string | null;
  /** Permisos que tenía el token al conectar (`null` = conexión hecha antes de guardarlos). */
  grantedPermissions: string[] | null;
}

const EMPTY: SocialSettings = { pageId: null, pageName: null, pageToken: null, igUserId: null, igUsername: null, appId: null, connectedAt: null, grantedPermissions: null };

const CACHE_TTL_MS = 20_000;
let cache: { at: number; settings: SocialSettings } | null = null;

export async function getSocialSettings(): Promise<SocialSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.settings;
  try {
    const { data, error } = await supabaseAdmin.from('social_settings').select('key, value');
    if (error) throw error;
    const row = new Map((data ?? []).map((r) => [r.key, r.value?.trim() || null]));
    const settings: SocialSettings = {
      pageId: row.get('page_id') ?? null,
      pageName: row.get('page_name') ?? null,
      pageToken: row.get('page_token') ?? null,
      igUserId: row.get('ig_user_id') ?? null,
      igUsername: row.get('ig_username') ?? null,
      appId: row.get('app_id') ?? null,
      connectedAt: row.get('connected_at') ?? null,
      grantedPermissions: row.get('granted_permissions') ? row.get('granted_permissions')!.split(',').filter(Boolean) : null,
    };
    cache = { at: Date.now(), settings };
    return settings;
  } catch (error) {
    console.warn('[social] configuración no disponible (¿corriste supabase/schema_social.sql?):', error instanceof Error ? error.message : error);
    return EMPTY;
  }
}

export function invalidateSocialSettingsCache(): void {
  cache = null;
}

/** Vista segura para el navegador: sin el token, sólo si hay conexión y a qué cuentas. */
export interface SocialSettingsView {
  connected: boolean;
  pageName: string | null;
  igUsername: string | null;
  hasInstagram: boolean;
  connectedAt: string | null;
  /** Permisos de publicación que le faltan a la conexión (vacío = todo bien; `null` = no se sabe). */
  missingPermissions: string[] | null;
}

export function toSafeView(settings: SocialSettings): SocialSettingsView {
  return {
    connected: Boolean(settings.pageId && settings.pageToken),
    pageName: settings.pageName,
    igUsername: settings.igUsername,
    hasInstagram: Boolean(settings.igUserId),
    connectedAt: settings.connectedAt,
    missingPermissions: settings.grantedPermissions ? missingPermissions(settings.grantedPermissions) : null,
  };
}

export async function saveConnection(input: {
  pageId: string;
  pageName: string;
  pageToken: string;
  igUserId: string | null;
  igUsername: string | null;
  appId: string;
  granted: string[];
}): Promise<void> {
  const rows = [
    { key: 'page_id', value: input.pageId },
    { key: 'page_name', value: input.pageName },
    { key: 'page_token', value: input.pageToken },
    { key: 'ig_user_id', value: input.igUserId },
    { key: 'ig_username', value: input.igUsername },
    { key: 'app_id', value: input.appId },
    { key: 'connected_at', value: new Date().toISOString() },
    { key: 'granted_permissions', value: input.granted.join(',') },
  ];
  const { error } = await supabaseAdmin.from('social_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
  invalidateSocialSettingsCache();
}

export async function clearConnection(): Promise<void> {
  const { error } = await supabaseAdmin
    .from('social_settings')
    .delete()
    .in('key', ['page_id', 'page_name', 'page_token', 'ig_user_id', 'ig_username', 'app_id', 'connected_at', 'granted_permissions']);
  if (error) throw error;
  invalidateSocialSettingsCache();
}
