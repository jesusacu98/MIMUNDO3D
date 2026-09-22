import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Configuración del chat de ideas, editable desde /admin/ideas/configuracion (tabla
// `idea_settings`, ver supabase/schema_ideas.sql). ÚNICO punto de lectura de esta configuración —
// nada más en `lib/ideas/` ni en las rutas de `/api/ideas/*` debe leer `process.env.IDEAS_*` o
// `process.env.ANTHROPIC_API_KEY` directamente; todo pasa por `getIdeaSettings()`.
//
// A propósito NO vive en variables de entorno (decisión explícita del dueño del negocio): así se
// puede reconfigurar desde el navegador y aplica al instante, sin volver a desplegar el sitio.
//
// La llave de Anthropic (`apiKey`) NUNCA debe pasarse a un Client Component ni a un Server Action
// devuelto al navegador — sólo la usan `getLlmProvider()` y el propio SDK, ambos server-only.
// Para la pantalla del admin, usar `toSafeView()`, que nunca incluye el valor completo.

export interface IdeaSettings {
  provider: 'auto' | 'mock' | 'anthropic';
  model: string;
  useCatalog: boolean;
  rateLimitPerHour: number;
  globalRateLimitPerHour: number;
  globalRateLimitPerDay: number;
  /** `null` si no hay llave guardada → el chat responde en modo demostración. */
  apiKey: string | null;
}

export const DEFAULT_MODEL = 'claude-haiku-4-5';

const DEFAULTS: IdeaSettings = {
  provider: 'auto',
  model: DEFAULT_MODEL,
  useCatalog: true,
  rateLimitPerHour: 40,
  globalRateLimitPerHour: 60,
  globalRateLimitPerDay: 250,
  apiKey: null,
};

// Corto a propósito: los cambios desde el admin deben notarse casi de inmediato, no sólo evitar
// una consulta a Supabase en cada mensaje del chat (que sigue siendo la razón principal del caché).
const CACHE_TTL_MS = 20_000;
let cache: { at: number; settings: IdeaSettings } | null = null;

const warned = new Set<string>();
function warnOnce(scope: string, message: string) {
  if (warned.has(scope)) return;
  warned.add(scope);
  console.warn(`[ideas] ${scope}: ${message}`);
}

function parsePositive(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

/**
 * Lee la configuración actual. Si la tabla no existe todavía o Supabase no responde, cae a los
 * valores por defecto (sin llave → simulación) en vez de romper el chat — mismo criterio de "falla
 * abierto, nunca corta el servicio" que ya usa el resto de `lib/ideas/persistence.ts`.
 */
export async function getIdeaSettings(): Promise<IdeaSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.settings;
  try {
    const { data, error } = await supabaseAdmin.from('idea_settings').select('key, value');
    if (error) throw error;

    const row = new Map((data ?? []).map((r) => [r.key, r.value ?? undefined]));
    const providerRaw = row.get('provider')?.trim().toLowerCase();
    const settings: IdeaSettings = {
      provider: providerRaw === 'mock' || providerRaw === 'anthropic' ? providerRaw : 'auto',
      model: row.get('model')?.trim() || DEFAULTS.model,
      useCatalog: row.get('use_catalog') !== 'false',
      rateLimitPerHour: parsePositive(row.get('rate_limit_per_hour'), DEFAULTS.rateLimitPerHour),
      globalRateLimitPerHour: parsePositive(row.get('global_rate_limit_per_hour'), DEFAULTS.globalRateLimitPerHour),
      globalRateLimitPerDay: parsePositive(row.get('global_rate_limit_per_day'), DEFAULTS.globalRateLimitPerDay),
      apiKey: row.get('anthropic_api_key')?.trim() || null,
    };
    cache = { at: Date.now(), settings };
    return settings;
  } catch (error) {
    warnOnce('configuración', `no disponible (¿corriste supabase/schema_ideas.sql?): ${describe(error)}. Usando valores por defecto.`);
    return DEFAULTS;
  }
}

export function invalidateIdeaSettingsCache(): void {
  cache = null;
}

/** Vista seguras para /admin/ideas/configuracion: nunca incluye la llave completa, sólo si existe y sus últimos 4 caracteres. */
export interface IdeaSettingsView {
  provider: IdeaSettings['provider'];
  model: string;
  useCatalog: boolean;
  rateLimitPerHour: number;
  globalRateLimitPerHour: number;
  globalRateLimitPerDay: number;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
}

export function toSafeView(settings: IdeaSettings): IdeaSettingsView {
  const { apiKey, ...rest } = settings;
  return { ...rest, hasApiKey: Boolean(apiKey), apiKeyPreview: apiKey ? apiKey.slice(-4) : null };
}

/** Guarda los campos del formulario principal (todo menos la llave, que tiene su propio flujo). */
export async function updateIdeaSettings(input: {
  provider: string;
  model: string;
  useCatalog: boolean;
  rateLimitPerHour: number;
  globalRateLimitPerHour: number;
  globalRateLimitPerDay: number;
}): Promise<void> {
  const rows = [
    { key: 'provider', value: input.provider },
    { key: 'model', value: input.model },
    { key: 'use_catalog', value: String(input.useCatalog) },
    { key: 'rate_limit_per_hour', value: String(input.rateLimitPerHour) },
    { key: 'global_rate_limit_per_hour', value: String(input.globalRateLimitPerHour) },
    { key: 'global_rate_limit_per_day', value: String(input.globalRateLimitPerDay) },
  ];
  const { error } = await supabaseAdmin.from('idea_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
  invalidateIdeaSettingsCache();
}

/** `value` guarda/reemplaza la llave; `null` la quita (el chat vuelve al modo demostración). */
export async function setIdeaApiKey(value: string | null): Promise<void> {
  const { error } = await supabaseAdmin.from('idea_settings').upsert({ key: 'anthropic_api_key', value }, { onConflict: 'key' });
  if (error) throw error;
  invalidateIdeaSettingsCache();
}

function describe(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return String(error);
}
