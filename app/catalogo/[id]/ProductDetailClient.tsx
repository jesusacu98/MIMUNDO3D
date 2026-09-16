'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { event } from '@/lib/gtag';
import type { Product, ColorOption } from '../types';
import { formatPrice } from '../types';
import ProductThumbnail from '../ProductThumbnail';
import { WhatsAppIcon } from '../icons';

const WHATSAPP_NUMBER = '526691224168';

interface ProductDetailClientProps {
  product: Product;
  colors: ColorOption[];
}

export default function ProductDetailClient({ product, colors }: ProductDetailClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [eslogan, setEslogan] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    event('view_item', { item_name: product.name, item_category: product.category });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  return (
    <div>
      <Link href="/catalogo" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-8">
        <ArrowLeft className="w-4 h-4" />
        Volver al catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Galería */}
        <div>
          <div className="aspect-square w-full bg-zinc-50 rounded-2xl border border-zinc-200/60 relative overflow-hidden">
            <ProductThumbnail
              key={product.images[selectedImageIndex] ?? product.image}
              src={product.images[selectedImageIndex] ?? product.image}
              alt={product.name}
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {product.images.length > 1 && (
            <div className="flex flex-wrap gap-3 mt-4">
              {product.images.map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setSelectedImageIndex(i)}
                  aria-label={`Ver imagen ${i + 1}`}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden relative shrink-0 border-2 transition-colors cursor-pointer ${
                    i === selectedImageIndex ? 'border-primary' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <Image src={img} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <span className="text-xs text-primary font-semibold uppercase tracking-wider">{product.category}</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 mt-2 mb-4">{product.name}</h1>
          <p className="text-zinc-600 leading-relaxed mb-8">{product.description}</p>

          {product.personalizable && (
            <div className="mb-6">
              <label htmlFor="custom-name" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                ¿Qué nombre quieres que lleve? <span className="text-primary">*</span>
              </label>
              <input
                id="custom-name"
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ej. Adriana"
                className={`w-full mt-2 px-4 py-2.5 bg-zinc-50 border rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all ${
                  attemptedSubmit && !customName.trim() ? 'border-red-400' : 'border-zinc-200'
                }`}
              />
              {attemptedSubmit && !customName.trim() && <p className="text-xs text-red-500 mt-1">Escribe el nombre que quieres que lleve.</p>}
            </div>
          )}

          {product.characterOption && (
            <div className="mb-6">
              <label htmlFor="character-name" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                ¿Qué personaje quieres? (opcional)
              </label>
              <input
                id="character-name"
                type="text"
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Ej. La rana René"
                className="w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
              />
            </div>
          )}

          {product.businessInfo && (
            <>
              <div className="mb-6">
                <label htmlFor="business-name" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Nombre de tu negocio o marca <span className="text-primary">*</span>
                </label>
                <input
                  id="business-name"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ej. El Malcriado Elotes"
                  className={`w-full mt-2 px-4 py-2.5 bg-zinc-50 border rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all ${
                    attemptedSubmit && !businessName.trim() ? 'border-red-400' : 'border-zinc-200'
                  }`}
                />
                {attemptedSubmit && !businessName.trim() && (
                  <p className="text-xs text-red-500 mt-1">Escribe el nombre de tu negocio o marca.</p>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="eslogan" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Eslogan <span className="text-primary">*</span>
                </label>
                <input
                  id="eslogan"
                  type="text"
                  value={eslogan}
                  onChange={(e) => setEslogan(e.target.value)}
                  placeholder="Ej. El toque perfecto para tu antojo"
                  className={`w-full mt-2 px-4 py-2.5 bg-zinc-50 border rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all ${
                    attemptedSubmit && !eslogan.trim() ? 'border-red-400' : 'border-zinc-200'
                  }`}
                />
                {attemptedSubmit && !eslogan.trim() && <p className="text-xs text-red-500 mt-1">Escribe el eslogan de tu negocio.</p>}
              </div>
            </>
          )}

          <div className="mb-8">
            <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Color {selectedColor ? `— ${selectedColor}` : ''} <span className="text-primary">*</span>
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.name === selectedColor ? null : color.name)}
                  title={color.name}
                  aria-label={color.name}
                  className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                    selectedColor === color.name ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
            {attemptedSubmit && !selectedColor && <p className="text-xs text-red-500 mt-2">Selecciona un color.</p>}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-zinc-200">
            <span className="text-3xl font-extrabold text-zinc-950">{formatPrice(product)}</span>
            <button
              onClick={() => {
                const missingName = product.personalizable && !customName.trim();
                const missingBusinessName = product.businessInfo && !businessName.trim();
                const missingEslogan = product.businessInfo && !eslogan.trim();
                const missingColor = !selectedColor;
                if (missingName || missingBusinessName || missingEslogan || missingColor) {
                  setAttemptedSubmit(true);
                  return;
                }
                const message = `¡Hola, MiMundo3D! 👋 Me interesa este producto: ${product.name} (${product.category})${
                  customName.trim() ? `, nombre: ${customName.trim()}` : ''
                }${characterName.trim() ? `, personaje: ${characterName.trim()}` : ''}${
                  businessName.trim() ? `, negocio/marca: ${businessName.trim()}` : ''
                }${eslogan.trim() ? `, eslogan: ${eslogan.trim()}` : ''}, color: ${selectedColor}. ¿Me pueden dar más información?`;
                event('generate_lead', {
                  method: 'whatsapp',
                  source: 'catalog_product_page',
                  item_name: product.name,
                  item_category: product.category,
                });
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Pedir por WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
