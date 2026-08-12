'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import ProductThumb from '../productos/ProductThumb';

export interface PickerProduct {
  id: string;
  name: string;
  price: number;
  cost: number | null;
  image_url: string;
  is_active: boolean;
}

interface ProductPickerProps {
  products: PickerProduct[];
  selected: PickerProduct | null;
  onSelect: (product: PickerProduct | null) => void;
}

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export default function ProductPicker({ products, selected, onSelect }: ProductPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex-1 flex items-center gap-3 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-primary/40 transition-colors cursor-pointer text-left"
        >
          {selected ? (
            <>
              <ProductThumb src={selected.image_url} alt={selected.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 truncate">{selected.name}</p>
                <p className="text-xs text-zinc-500">
                  Costo unitario: {selected.cost != null ? currency.format(selected.cost) : 'sin definir'}
                </p>
              </div>
            </>
          ) : (
            <span className="text-sm text-zinc-500 flex-1">Ninguno — pedido personalizado</span>
          )}
          <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-label="Quitar producto"
            className="p-2 text-zinc-400 hover:text-red-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-50">
            {filtered.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(product);
                    setQuery('');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50 text-left cursor-pointer"
                >
                  <ProductThumb src={product.image_url} alt={product.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900 truncate">
                      {product.name} {!product.is_active && <span className="text-zinc-400">(oculto)</span>}
                    </p>
                    <p className="text-xs text-zinc-500">${product.price} MXN</p>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-zinc-500">Sin resultados.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
