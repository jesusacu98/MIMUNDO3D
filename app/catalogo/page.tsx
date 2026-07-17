'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, Printer, ArrowLeft } from 'lucide-react';

const CATEGORIES = ['Todos', 'FDM', 'Resina (SLA)', 'NFC Inteligente', 'Accesorios'];

const PLACEHOLDER_PRODUCTS = [
  {
    id: 1,
    name: 'Expositor NFC de Pago BBVA/Clip',
    category: 'NFC Inteligente',
    description: 'Soporte impreso en 3D premium con chip NFC integrado y código QR grabado para facilitar transferencias.',
    price: '$350 MXN',
    badge: 'Popular',
  },
  {
    id: 2,
    name: 'Figura Coleccionable - Dragón Articulado',
    category: 'FDM',
    description: 'Impresión articulada de alta precisión en material PLA seda multicolor, sin necesidad de ensamblaje.',
    price: '$240 MXN',
    badge: 'Nuevo',
  },
  {
    id: 3,
    name: 'Busto Escultura Griega Clásica',
    category: 'Resina (SLA)',
    description: 'Impresión en resina fotosensible de ultra-definición (4K) con detalles microscópicos y acabado mate suave.',
    price: '$450 MXN',
    badge: 'Destacado',
  },
  {
    id: 4,
    name: 'Organizador Modular de Escritorio',
    category: 'FDM',
    description: 'Sistema personalizable con soportes para plumas, celular y cajones pequeños. Impreso en PETG resistente.',
    price: '$180 MXN',
    badge: 'Útil',
  }
];

export default function Catalogo() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const filteredProducts = PLACEHOLDER_PRODUCTS.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
                          product.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="mr-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              MIMUNDO<span className="text-indigo-400 font-extrabold">3D</span>
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Inicio
            </Link>
            <Link href="/catalogo" className="text-sm font-medium text-indigo-400 transition-colors">
              Catálogo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Header */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="text-left mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Nuestro Catálogo
          </h1>
          <p className="text-slate-400 max-w-xl">
            Explora nuestra colección de productos impresos en 3D y soluciones de pago rápido. Calidad y diseño a tu alcance.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/50 border border-slate-900 rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar producto, material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0 hidden sm:inline" />
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-slate-900/20 border border-slate-900 rounded-2xl overflow-hidden hover:border-indigo-500/25 transition-all group flex flex-col h-full"
              >
                <div className="aspect-square w-full bg-slate-950 relative overflow-hidden flex items-center justify-center text-slate-850">
                  <div className="absolute inset-0 bg-linear-to-b from-indigo-500/5 to-purple-500/5" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
                  <div className="flex flex-col items-center justify-center p-6 text-center z-10">
                    <Printer className="w-12 h-12 text-slate-800 mb-3 group-hover:text-indigo-400 transition-colors duration-300" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                      Visualizar Pieza
                    </span>
                  </div>
                  {product.badge && (
                    <span className="absolute top-3 left-3 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {product.badge}
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <span className="text-xs text-indigo-450 font-semibold mb-1 uppercase tracking-wider">{product.category}</span>
                  <h3 className="text-md font-bold text-white mb-2 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4 flex-grow">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-900">
                    <span className="text-sm font-extrabold text-white">{product.price}</span>
                    <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 group/btn">
                      Ver Detalles
                      <span className="transition-transform group-hover/btn:translate-x-0.5">→</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/10 border border-dashed border-slate-900 rounded-2xl">
            <p className="text-slate-500 text-sm">No se encontraron productos que coincidan con la búsqueda.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-xs text-slate-500 mt-auto">
        <p>© {new Date().getFullYear()} MIMUNDO3D. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
