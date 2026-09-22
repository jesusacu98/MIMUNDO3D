'use server';

import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/auth';
import { setIdeaApiKey, updateIdeaSettings } from '@/lib/ideas/settings';

const PATH = '/admin/ideas/configuracion';

interface SettingsFormValues {
  provider: string;
  model: string;
  useCatalog: boolean;
  rateLimitPerHour: number;
  globalRateLimitPerHour: number;
  globalRateLimitPerDay: number;
  apiKey: string;
}

function parseSettingsForm(formData: FormData): { values: SettingsFormValues } | { error: string } {
  const provider = String(formData.get('provider') || 'auto');
  if (!['auto', 'mock', 'anthropic'].includes(provider)) {
    return { error: 'Proveedor inválido.' };
  }

  const model = String(formData.get('model') || '').trim();
  if (!model) return { error: 'El modelo no puede quedar vacío.' };

  const useCatalog = formData.get('use_catalog') === 'on';

  const numbers: Record<string, number> = {};
  for (const [field, label] of [
    ['rate_limit_per_hour', 'El límite por visitante'],
    ['global_rate_limit_per_hour', 'El techo global por hora'],
    ['global_rate_limit_per_day', 'El techo global por día'],
  ] as const) {
    const raw = String(formData.get(field) || '');
    const n = Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      return { error: `${label} debe ser un número entero mayor a 0.` };
    }
    numbers[field] = n;
  }

  return {
    values: {
      provider,
      model,
      useCatalog,
      rateLimitPerHour: numbers.rate_limit_per_hour,
      globalRateLimitPerHour: numbers.global_rate_limit_per_hour,
      globalRateLimitPerDay: numbers.global_rate_limit_per_day,
      apiKey: String(formData.get('api_key') || '').trim(),
    },
  };
}

/** Guarda todos los campos del formulario. Si "api_key" viene vacío, la llave guardada NO se toca. */
export async function saveIdeaSettings(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseSettingsForm(formData);
  if ('error' in parsed) {
    redirect(`${PATH}?error=${encodeURIComponent(parsed.error)}`);
  }

  try {
    await updateIdeaSettings({
      provider: parsed.values.provider,
      model: parsed.values.model,
      useCatalog: parsed.values.useCatalog,
      rateLimitPerHour: parsed.values.rateLimitPerHour,
      globalRateLimitPerHour: parsed.values.globalRateLimitPerHour,
      globalRateLimitPerDay: parsed.values.globalRateLimitPerDay,
    });
    if (parsed.values.apiKey) await setIdeaApiKey(parsed.values.apiKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    redirect(`${PATH}?error=${encodeURIComponent('No se pudo guardar: ' + message)}`);
  }

  redirect(`${PATH}?ok=1`);
}

/** Quita la llave guardada — el chat vuelve al modo demostración. No toca el resto de la configuración. */
export async function clearIdeaApiKey() {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  try {
    await setIdeaApiKey(null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    redirect(`${PATH}?error=${encodeURIComponent('No se pudo quitar la llave: ' + message)}`);
  }

  redirect(`${PATH}?ok=1`);
}
