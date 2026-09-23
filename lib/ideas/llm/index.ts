import { OpenAIProvider } from './openai';
import { MockProvider } from './mock';
import type { LlmProvider } from './types';
import type { IdeaSettings } from '../settings';

export type { LlmProvider } from './types';

/**
 * Elige el proveedor de IA del chat de ideas. ÚNICO lugar que conoce a los proveedores concretos.
 * Es una función pura: recibe la configuración ya resuelta (`getIdeaSettings()`, en
 * `lib/ideas/settings.ts`) en vez de leer `process.env` ella misma — así el mismo código sirve
 * tanto si la configuración viene de la base de datos (como hoy, desde /admin/ideas/configuracion)
 * como de cualquier otra fuente en el futuro.
 *
 * - Sin llave guardada → simulación (`MockProvider`), para ver y probar todo sin costo.
 * - Con llave → OpenAI, con el modelo configurado (misma cuenta que usa el generador de diseños
 *   en `/admin/disenos`, ver `lib/disenos/generate.ts`).
 * - `provider: 'mock' | 'openai'` fuerza uno u otro (útil para demos con la llave puesta).
 *
 * Para usar otro LLM (ej. volver a Claude, ver `./anthropic.ts` que queda en el repo sin
 * referenciar): crear/reactivar `lib/ideas/llm/<proveedor>.ts` con una clase que implemente
 * `LlmProvider` (ver `./types.ts`) y agregar aquí su caso. El resto del sistema no cambia.
 */
export function getLlmProvider(settings: Pick<IdeaSettings, 'provider' | 'model' | 'apiKey'>): LlmProvider {
  const { provider: forced, apiKey } = settings;

  if (forced === 'mock' || (!apiKey && forced !== 'openai')) {
    return new MockProvider();
  }
  return new OpenAIProvider(settings.model, {
    apiKey: apiKey ?? undefined,
    // Sólo para pruebas locales contra un servidor de OpenAI simulado; no es configurable desde
    // el admin porque no tiene sentido cambiarlo en producción.
    baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
  });
}
