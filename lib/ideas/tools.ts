import { getActiveProduct, searchCatalog } from './catalog';
import type { LlmToolCall, LlmToolDef, LlmToolResult } from './llm/types';
import type { IdeaCardData } from './types';

export const SEARCH_CATALOG_TOOL_NAME = 'buscar_catalogo';
export const SHOW_IDEAS_TOOL_NAME = 'mostrar_ideas';

const MAX_IDEAS = 12;
const MAX_TITLE_CHARS = 80;
const MAX_DESCRIPTION_CHARS = 300;

export const SEARCH_CATALOG_TOOL: LlmToolDef = {
  name: SEARCH_CATALOG_TOOL_NAME,
  description:
    'Busca en el catálogo REAL de MiMundo3D productos que ya fabricamos. Usa palabras clave cortas en español ' +
    '(ej. "organizador cables", "llavero", "porta celular", "display"). Puedes llamarla varias veces en paralelo ' +
    'con distintas palabras. Devuelve {"productos":[{id,nombre,categoria,subcategoria}]}; una lista vacía significa ' +
    'que no tenemos ese producto en el catálogo (aun así se puede fabricar a la medida).',
  inputSchema: {
    type: 'object',
    properties: {
      consulta: { type: 'string', description: 'Palabras clave del producto a buscar.' },
    },
    required: ['consulta'],
  },
};

export const SHOW_IDEAS_TOOL: LlmToolDef = {
  name: SHOW_IDEAS_TOOL_NAME,
  description:
    'Muestra al cliente una lista de ideas como tarjetas que puede guardar en su cotización. Llámala UNA sola vez por ' +
    'respuesta con todas las ideas (6 a 10). Si una idea es exactamente un producto que devolvió buscar_catalogo, ' +
    'incluye su product_id. No repitas en el texto lo que ya va en las tarjetas.',
  inputSchema: {
    type: 'object',
    properties: {
      ideas: {
        type: 'array',
        description: 'Ideas de producto para el cliente.',
        items: {
          type: 'object',
          properties: {
            titulo: { type: 'string', description: 'Nombre corto de la idea (ej. "Organizador de cables").' },
            descripcion: { type: 'string', description: 'Una o dos frases: qué es y cómo le sirve al cliente.' },
            product_id: {
              type: 'string',
              description: 'id EXACTO devuelto por buscar_catalogo; sólo si la idea es ese producto. Nunca lo inventes.',
            },
          },
          required: ['titulo', 'descripcion'],
        },
      },
    },
    required: ['ideas'],
  },
};

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export interface ToolExecution {
  result: LlmToolResult;
  /** Tarjetas a enviar al navegador (sólo `mostrar_ideas`). */
  ideas?: IdeaCardData[];
}

/**
 * Ejecuta una llamada del modelo. Los inputs vienen del modelo (que a su vez lee texto del cliente),
 * así que se validan y recortan aquí; los precios y enlaces salen SIEMPRE de la base de datos.
 */
export async function executeTool(call: LlmToolCall, opts: { useCatalog: boolean; cardIdPrefix: string }): Promise<ToolExecution> {
  const base = { callId: call.id, name: call.name };

  if (call.name === SEARCH_CATALOG_TOOL_NAME && opts.useCatalog) {
    const consulta = clean(call.input.consulta, 100);
    if (!consulta) return { result: { ...base, content: 'Falta el parámetro "consulta".', isError: true } };
    const productos = await searchCatalog(consulta);
    return { result: { ...base, content: JSON.stringify({ productos }) } };
  }

  if (call.name === SHOW_IDEAS_TOOL_NAME) {
    const raw = Array.isArray(call.input.ideas) ? call.input.ideas : [];
    const ideas: IdeaCardData[] = [];
    const usedProducts = new Set<string>();

    for (const item of raw.slice(0, MAX_IDEAS)) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const title = clean(record.titulo, MAX_TITLE_CHARS);
      const description = clean(record.descripcion, MAX_DESCRIPTION_CHARS);
      if (!title) continue;

      let product: IdeaCardData['product'];
      const productId = clean(record.product_id, 64);
      if (opts.useCatalog && productId && !usedProducts.has(productId)) {
        product = (await getActiveProduct(productId)) ?? undefined; // ids inventados o inactivos se descartan
        if (product) usedProducts.add(productId);
      }
      ideas.push({ id: `${opts.cardIdPrefix}-${ideas.length}`, title, description, ...(product ? { product } : {}) });
    }

    if (ideas.length === 0) {
      return { result: { ...base, content: 'No se recibió ninguna idea válida; vuelve a intentarlo.', isError: true } };
    }
    return { result: { ...base, content: `Se mostraron ${ideas.length} tarjetas al cliente.` }, ideas };
  }

  return { result: { ...base, content: `Herramienta desconocida: ${call.name}`, isError: true } };
}
