// Catálogo de modelos de imagen para el selector de /admin/disenos. Curado a mano — si tu proyecto
// de OpenAI restringe qué modelos podés usar ("Allowed models" en platform.openai.com), habilitá
// ahí el que elijas acá. El selector siempre deja una opción "Otro" para escribir cualquier otro id.
//
// Actualizado 2026-09-22 tras confirmar contra developers.openai.com/api/docs/deprecations que
// `gpt-image-1` y `gpt-image-1.5` (la lista anterior) se retiran el 2026-12-01 — reemplazo
// oficial: `gpt-image-2`. Dall·E 2/3 se sacaron de la lista curada (siguen andando vía "Otro")
// por ser claramente inferiores a la familia GPT Image actual.

export interface ImageModelOption {
  id: string;
  label: string;
  description: string;
}

export const IMAGE_MODELS: ImageModelOption[] = [
  {
    id: 'gpt-image-2',
    label: 'GPT Image 2',
    description: 'El recomendado: reemplazo oficial de gpt-image-1, disponible de forma general, el modelo de imagen más capaz vigente.',
  },
  {
    id: 'gpt-image-2.5-flare',
    label: 'GPT Image 2.5 Flare',
    description: 'El más nuevo (sept. 2026). OpenAI lo recomienda para generación cotidiana: rápido y buena calidad — vale la pena comparar contra gpt-image-2.',
  },
  {
    id: 'gpt-image-2.5-sunburst',
    label: 'GPT Image 2.5 Sunburst',
    description: 'Misma familia que Flare pero priorizando detalle sobre velocidad — para un diseño puntual donde la precisión importa más que el tiempo.',
  },
  {
    id: 'gpt-image-1-mini',
    label: 'GPT Image 1 mini',
    description: 'El más barato de la lista, con algo menos de detalle — para tirar variantes rápido y comparar antes de gastar en una versión de mejor calidad.',
  },
];

export const DEFAULT_IMAGE_MODEL = 'gpt-image-2';
