import { supabase } from '@/lib/supabaseClient';
import { keywordsOf, normalizeText } from './text';
import type { IdeaProduct } from './types';

// Acceso de SOLO LECTURA al catálogo para el chat de ideas. Usa el cliente anon (sujeto a RLS,
// sólo ve productos activos) y nunca selecciona `cost`. El catálogo se guarda en memoria 60 s
// (igual que el ISR de /catalogo) para no consultar Supabase en cada mensaje del chat.

interface CatalogEntry {
  product: IdeaProduct;
  category: string;
  subcategory: string;
  nameNorm: string;
  groupNorm: string;
  descriptionNorm: string;
}

const CACHE_TTL_MS = 60_000;
let cache: { at: number; entries: CatalogEntry[] } | null = null;

async function loadCatalog(): Promise<CatalogEntry[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.entries;

  const [products, categories, subcategories] = await Promise.all([
    supabase
      .from('products')
      .select('id, category_id, subcategory_id, name, description, price, is_starting_price')
      .eq('is_active', true),
    supabase.from('product_categories').select('id, name'),
    supabase.from('product_subcategories').select('id, name'),
  ]);

  if (products.error) {
    console.error('[ideas] No se pudo leer el catálogo:', products.error.message);
    return cache?.entries ?? [];
  }

  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]));
  const subcategoryName = new Map((subcategories.data ?? []).map((s) => [s.id, s.name]));

  const entries = (products.data ?? []).map((p): CatalogEntry => {
    const category = categoryName.get(p.category_id) ?? '';
    const subcategory = p.subcategory_id ? (subcategoryName.get(p.subcategory_id) ?? '') : '';
    return {
      product: {
        id: p.id,
        name: p.name,
        price: p.price,
        isStartingPrice: p.is_starting_price,
        url: `/catalogo/${p.id}`,
      },
      category,
      subcategory,
      nameNorm: normalizeText(p.name),
      groupNorm: normalizeText(`${category} ${subcategory}`),
      descriptionNorm: normalizeText(p.description ?? ''),
    };
  });

  cache = { at: Date.now(), entries };
  return entries;
}

export interface CatalogSearchHit {
  id: string;
  nombre: string;
  categoria: string;
  subcategoria: string;
}

/** Busca por palabras clave (nombre pesa más que categoría, y ésta más que la descripción). */
export async function searchCatalog(query: string, limit = 8): Promise<CatalogSearchHit[]> {
  const keywords = keywordsOf(query);
  if (keywords.length === 0) return [];

  const entries = await loadCatalog();
  return entries
    .map((entry) => {
      let score = 0;
      for (const k of keywords) {
        if (entry.nameNorm.includes(k)) score += 3;
        if (entry.groupNorm.includes(k)) score += 2;
        if (entry.descriptionNorm.includes(k)) score += 1;
      }
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => ({
      id: entry.product.id,
      nombre: entry.product.name,
      categoria: entry.category,
      subcategoria: entry.subcategory,
    }));
}

/** Datos reales (nombre, precio, enlace) de un producto activo; `null` si no existe o ya no está activo. */
export async function getActiveProduct(id: string): Promise<IdeaProduct | null> {
  const entries = await loadCatalog();
  return entries.find((e) => e.product.id === id)?.product ?? null;
}
