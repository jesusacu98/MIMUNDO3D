'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import { event } from '@/lib/gtag';
import type { Product, ColorOption } from './types';
import { formatPrice } from './types';
import ProductThumbnail from './ProductThumbnail';
import CatalogHeader from './CatalogHeader';
import CatalogFooter from './CatalogFooter';
import BannerSlider from '@/components/BannerSlider';
import type { Banner } from '@/lib/banners';

export type { Product, ColorOption };

interface CatalogoClientProps {
  products: Product[];
  categoryNames: string[];
  banners?: Banner[];
}

export default function CatalogoClient({ products, categoryNames, banners = [] }: CatalogoClientProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => categoryNames.indexOf(a.category) - categoryNames.indexOf(b.category));

  useEffect(() => {
    if (!search.trim()) return;
    const timeout = setTimeout(() => {
      event('search', { search_term: search.trim() });
    }, 800);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="flex flex-col min-h-screen min-w-0 bg-zinc-50 text-zinc-900 selection:bg-primary selection:text-white">
      <CatalogHeader />

      {/* Hero Header */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 min-w-0">
        {banners.length > 0 && (
          <div className="mb-10">
            <BannerSlider banners={banners} />
          </div>
        )}
        <div className="text-left mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 mb-3">
            Nuestro Catálogo
          </h1>
          <p className="text-zinc-600 max-w-xl">
            Explora nuestra colección de productos impresos en 3D. Calidad y diseño a tu alcance.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar producto, material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto min-w-0 no-scrollbar py-1">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:inline" />
            {categoryNames.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  event('select_content', { content_type: 'category_filter', item_id: category });
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white text-zinc-500 border border-zinc-200 hover:text-zinc-900 hover:border-zinc-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div key={selectedCategory} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <Link
                key={product.id}
                href={`/catalogo/${product.id}`}
                style={{ '--delay': `${Math.min(index, 11) * 50}ms` } as React.CSSProperties}
                className="animate-fade-up bg-white p-2 border border-zinc-200/60 rounded-3xl overflow-hidden shadow-md shadow-zinc-900/10 ring-1 ring-black/5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col h-full cursor-pointer"
              >
                <div className="aspect-square w-full bg-zinc-50 relative overflow-hidden rounded-2xl">
                  <ProductThumbnail src={product.image} alt={product.name} />
                </div>
                <div className="px-3 pt-4 pb-3 flex flex-col flex-grow">
                  <span className="text-xs text-primary font-semibold mb-1 uppercase tracking-wider">{product.category}</span>
                  <h3 className="text-md font-bold text-zinc-950 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-4 flex-grow">
                    {product.description}
                  </p>
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
            <p className="text-zinc-500 text-sm">No se encontraron productos que coincidan con la búsqueda.</p>
          </div>
        )}
      </main>

      <CatalogFooter />
    </div>
  );
}
