import { AnthropicProvider } from './anthropic';
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
 * - Con llave → Claude, con el modelo configurado.
 * - `provider: 'mock' | 'anthropic'` fuerza uno u otro (útil para demos con la llave puesta).
 *
 * Para usar otro LLM: crear `lib/ideas/llm/<proveedor>.ts` con una clase que implemente
 * `LlmProvider` (ver `./types.ts`) y agregar aquí su caso. El resto del sistema no cambia.
 */
export function getLlmProvider(settings: Pick<IdeaSettings, 'provider' | 'model' | 'apiKey'>): LlmProvider {
  const { provider: forced, apiKey } = settings;

  if (forced === 'mock' || (!apiKey && forced !== 'anthropic')) {
    return new MockProvider();
  }
  return new AnthropicProvider(settings.model, {
    apiKey: apiKey ?? undefined,
    // Sólo para pruebas locales contra un servidor de Anthropic simulado; no es configurable desde
    // el admin porque no tiene sentido cambiarlo en producción.
    baseURL: process.env.ANTHROPIC_BASE_URL?.trim() || undefined,
  });
}
