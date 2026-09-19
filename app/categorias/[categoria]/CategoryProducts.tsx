'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { useIsAdmin } from '@/lib/useIsAdmin';
import ProductThumbnail from '../../catalogo/ProductThumbnail';
import { formatPrice, type Product } from '../../catalogo/types';
import CopyLinkButton from './CopyLinkButton';

export interface CategoryProduct extends Product {
  subcategory: string | null;
}

interface CategoryProductsProps {
  products: CategoryProduct[];
  // Nombres de subcategoría en el orden que definió el admin.
  subcategoryOrder: string[];
  categorySlug: string;
  // Valores que vienen de la URL al abrir el enlace (?tipo=…&min=…&max=…).
  initialTipo: string;
  initialMin: string;
  initialMax: string;
}

const SEARCH_DELAY_MS = 350;

// Compara sin acentos ni mayúsculas: "Cortadór" coincide con "cortador".
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function parsePrice(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const fieldClass =
  'w-full mt-1.5 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';

export default function CategoryProducts({ products, subcategoryOrder, categorySlug, initialTipo, initialMin, initialMax }: CategoryProductsProps) {
  const isAdmin = useIsAdmin();

  const types = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const p of products) {
      const label = p.subcategory?.trim();
      if (!label) continue;
      const key = slugify(label);
      const entry = map.get(key);
      if (entry) entry.count += 1;
      else map.set(key, { label, count: 1 });
    }
    return Array.from(map, ([slug, { label, count }]) => ({ slug, label, count })).sort(
      (a, b) => subcategoryOrder.indexOf(a.label) - subcategoryOrder.indexOf(b.label)
    );
  }, [products, subcategoryOrder]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState(types.some((t) => t.slug === initialTipo) ? initialTipo : '');
  const [min, setMin] = useState(parsePrice(initialMin) !== null ? initialMin : '');
  const [max, setMax] = useState(parsePrice(initialMax) !== null ? initialMax : '');

  // El buscador espera a que se deje de escribir antes de filtrar.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Sólo los filtros (tipo y precio) viajan en la URL; la búsqueda no.
  useEffect(() => {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (min) params.set('min', min);
    if (max) params.set('max', max);
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [tipo, min, max]);

  const minValue = parsePrice(min);
  const maxValue = parsePrice(max);
  const normalizedSearch = normalize(search);

  const filtered = products.filter((p) => {
    if (tipo && slugify(p.subcategory ?? '') !== tipo) return false;
    if (minValue !== null && p.price < minValue) return false;
    if (maxValue !== null && p.price > maxValue) return false;
    if (normalizedSearch && !normalize(`${p.name} ${p.description}`).includes(normalizedSearch)) return false;
    return true;
  });

  const prices = products.map((p) => p.price);
  const cheapest = prices.length > 0 ? Math.min(...prices) : 0;
  const priciest = prices.length > 0 ? Math.max(...prices) : 0;
  const hasActiveFilters = Boolean(searchInput || tipo || min || max);

  const clearAll = () => {
    setSearchInput('');
    setSearch('');
    setTipo('');
    setMin('');
    setMax('');
  };

  const detailQuery = new URLSearchParams({ desde: categorySlug });
  if (tipo) detailQuery.set('tipo', tipo);
  if (min) detailQuery.set('min', min);
  if (max) detailQuery.set('max', max);

  return (
    <>
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8 space-y-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar producto..."
            aria-label="Buscar producto"
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
          />
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm font-bold text-zinc-950">Filtros</span>
            <div className="flex items-center gap-4">
              {isAdmin && <CopyLinkButton />}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="filter-tipo" className={labelClass}>
                Subcategoría
              </label>
              <select id="filter-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={types.length === 0} className={fieldClass}>
                <option value="">{types.length === 0 ? 'Sin subcategorías' : 'Todas'}</option>
                {types.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.label} ({t.count})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-min" className={labelClass}>
                Precio mínimo
              </label>
              <input
                id="filter-min"
                type="number"
                inputMode="decimal"
                min="0"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder={`$${cheapest}`}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="filter-max" className={labelClass}>
                Precio máximo
              </label>
              <input
                id="filter-max"
                type="number"
                inputMode="decimal"
                min="0"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder={`$${priciest}`}
                className={fieldClass}
              />
            </div>
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((product) => (
            <Link
              key={product.id}
              href={`/catalogo/${product.id}?${detailQuery.toString()}`}
              className="bg-white border border-zinc-200/60 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col h-full cursor-pointer"
            >
              <div className="aspect-square w-full bg-zinc-50 relative overflow-hidden">
                <ProductThumbnail src={product.image} alt={product.name} />
              </div>
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-md font-bold text-zinc-950 mb-2 line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
                <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-4 flex-grow">{product.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                  <span className="text-sm font-extrabold text-zinc-950">{formatPrice(product)}</span>
                  <span className="text-xs font-bold text-primary group-hover:text-primary-dark flex items-center gap-1">
                    Ver Detalles
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-dashed border-zinc-200 rounded-2xl">
          <p className="text-zinc-500 text-sm">
            {products.length === 0
              ? 'Todavía no hay productos publicados en esta categoría. Vuelve pronto.'
              : 'No hay productos que coincidan con los filtros.'}
          </p>
        </div>
      )}
    </>
  );
}
