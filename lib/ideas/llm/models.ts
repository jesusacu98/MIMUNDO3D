// Catálogo de modelos por proveedor, para el selector de /admin/ideas/configuracion. Curado a
// mano (ningún proveedor expone un endpoint estable de "modelos disponibles con descripción") —
// si alguno cambia de nombre o se descontinúa, el selector siempre deja una opción "Otro" para
// escribirlo a mano, así el admin nunca queda bloqueado por este archivo desactualizado.
//
// Actualizado 2026-09-22 tras confirmar contra developers.openai.com/api/docs/deprecations que
// `gpt-5`, `gpt-5-mini` y `gpt-5-nano` (la lista anterior) se retiran el 2026-12-11 — reemplazo
// oficial: la familia `gpt-5.6` (sol/terra/luna). Si en el futuro esta lista vuelve a quedar
// vieja, esos modelos siguen siendo usables vía la opción "Otro" hasta que OpenAI los apague.

export interface LlmModelOption {
  id: string;
  label: string;
  description: string;
}

const OPENAI_TEXT_MODELS: LlmModelOption[] = [
  {
    id: 'gpt-5.6-luna',
    label: 'GPT-5.6 Luna',
    description: 'El que recomienda OpenAI para chats de mucho tráfico y costo sensible — el más barato de la familia vigente.',
  },
  {
    id: 'gpt-5.6-terra',
    label: 'GPT-5.6 Terra',
    description: 'Balance entre inteligencia y costo, mejor calidad de respuesta que Luna — más caro.',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    description: 'Alternativa de la familia anterior, ampliamente disponible en cualquier cuenta sin restricciones especiales de acceso.',
  },
];

/** `mock` no usa modelo (respuestas simuladas) — lista vacía a propósito. */
export const MODELS_BY_PROVIDER: Record<'openai' | 'mock', LlmModelOption[]> = {
  openai: OPENAI_TEXT_MODELS,
  mock: [],
};
