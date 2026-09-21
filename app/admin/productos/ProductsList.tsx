'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Search, X } from 'lucide-react';
import ProductThumb from './ProductThumb';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export interface AdminProduct {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name: string;
  price: number;
  cost: number | null;
  is_starting_price: boolean;
  image_url: string;
  is_active: boolean;
}

interface Option {
  id: string;
  name: string;
}

interface SubcategoryOption extends Option {
  category_id: string;
}

// Minúsculas y sin acentos, para que "camara" encuentre "Cámara".
const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const selectClass =
  'w-full sm:w-auto px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 cursor-pointer';

export default function ProductsList({
  products,
  categories,
  subcategories,
}: {
  products: AdminProduct[];
  categories: Option[];
  subcategories: SubcategoryOption[];
}) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');

  const categoryNameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const subcategoryNameById = useMemo(() => new Map(subcategories.map((s) => [s.id, s.name])), [subcategories]);
  const categorySubcategories = subcategories.filter((s) => s.category_id === categoryId);

  const query = normalize(search.trim());
  const filtered = products.filter((p) => {
    if (categoryId && p.category_id !== categoryId) return false;
    if (subcategoryId && p.subcategory_id !== subcategoryId) return false;
    if (!query) return true;
    const haystack = normalize(
      [p.name, categoryNameById.get(p.category_id), p.subcategory_id ? subcategoryNameById.get(p.subcategory_id) : '']
        .filter(Boolean)
        .join(' '),
    );
    return haystack.includes(query);
  });

  const hasFilters = search !== '' || categoryId !== '' || subcategoryId !== '';
  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setSubcategoryId('');
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, categoría o subcategoría…"
            aria-label="Buscar productos"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
        </div>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubcategoryId('');
          }}
          aria-label="Filtrar por categoría"
          className={selectClass}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={subcategoryId}
          onChange={(e) => setSubcategoryId(e.target.value)}
          disabled={!categoryId || categorySubcategories.length === 0}
          aria-label="Filtrar por subcategoría"
          className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">
            {!categoryId ? 'Subcategoría (elige categoría)' : categorySubcategories.length === 0 ? 'Sin subcategorías' : 'Todas las subcategorías'}
          </option>
          {categorySubcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            Limpiar
          </button>
        )}
      </div>
      {hasFilters && (
        <p className="text-sm text-zinc-500 mb-4">
          {filtered.length} de {products.length} producto(s).
        </p>
      )}

      {/* Mobile: tarjetas apiladas, toda la fila es tocable */}
      <div className="sm:hidden bg-white border border-zinc-200/60 rounded-2xl overflow-hidden divide-y divide-zinc-100">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/admin/productos/${product.id}/editar`}
            className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-zinc-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ProductThumb src={product.image_url} alt={product.name} size={44} />
              <div className="min-w-0">
                <p className="font-medium text-zinc-900 truncate">{product.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {categoryNameById.get(product.category_id) ?? '—'} · {product.is_starting_price ? 'Desde ' : ''}$
                  {product.price} MXN
                  {product.cost != null && ` · Costo ${currency.format(product.cost)}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                  product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                }`}
              >
                {product.is_active ? 'Activo' : 'Oculto'}
              </span>
              <Pencil className="w-4 h-4 text-primary" />
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-zinc-500 text-sm">
            {products.length === 0 ? 'Todavía no hay productos.' : 'Ningún producto coincide con los filtros.'}
          </p>
        )}
      </div>

      {/* Desktop/tablet: tabla completa */}
      <div className="hidden sm:block bg-white border border-zinc-200/60 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3" />
              <th className="text-left px-5 py-3 font-semibold">Producto</th>
              <th className="text-left px-5 py-3 font-semibold">Categoría</th>
              <th className="text-left px-5 py-3 font-semibold">Precio</th>
              <th className="text-left px-5 py-3 font-semibold">Costo</th>
              <th className="text-left px-5 py-3 font-semibold">Estado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((product) => (
              <tr key={product.id} className="hover:bg-zinc-50/60">
                <td className="pl-5 py-3">
                  <ProductThumb src={product.image_url} alt={product.name} size={40} />
                </td>
                <td className="px-5 py-3 font-medium text-zinc-900">{product.name}</td>
                <td className="px-5 py-3 text-zinc-600">{categoryNameById.get(product.category_id) ?? '—'}</td>
                <td className="px-5 py-3 text-zinc-600">
                  {product.is_starting_price ? 'Desde ' : ''}${product.price} MXN
                </td>
                <td className="px-5 py-3 text-zinc-600">{product.cost != null ? currency.format(product.cost) : '—'}</td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      product.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {product.is_active ? 'Activo' : 'Oculto'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/productos/${product.id}/editar`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-zinc-500">
                  {products.length === 0 ? 'Todavía no hay productos.' : 'Ningún producto coincide con los filtros.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
