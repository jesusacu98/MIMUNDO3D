'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HOME_CATEGORIES } from '@/lib/homeCategories';
import { event } from '@/lib/gtag';
import type { Product } from '../types';
import { formatPrice } from '../types';
import ProductThumbnail from '../ProductThumbnail';
import { WhatsAppIcon } from '../icons';

const WHATSAPP_NUMBER = '526691224168';

interface ProductDetailClientProps {
  product: Product;
  backHref: string;
  backLabel: string;
}

export default function ProductDetailClient({ product, backHref, backLabel }: ProductDetailClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [customName, setCustomName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [eslogan, setEslogan] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    event('view_item', { item_name: product.name, item_category: product.category });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);


  const categorySlug = HOME_CATEGORIES.find((c) => c.dbName === product.category)?.slug;
  const currentImage = product.images[selectedImageIndex] ?? product.image;

  return (
    <div>
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-8">
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-x-12 gap-y-10">
        {/* Galería */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="aspect-square w-full bg-zinc-50 rounded-2xl border border-zinc-200/60 relative overflow-hidden">
            <ProductThumbnail key={currentImage} src={currentImage} alt={product.name} sizes="(max-width: 1024px) 100vw, 60vw" />
            {product.images.length > 1 && (
              <span className="absolute top-4 right-4 text-sm font-medium text-zinc-600 bg-white/80 backdrop-blur px-2.5 py-0.5 rounded-full">
                {selectedImageIndex + 1} / {product.images.length}
              </span>
            )}
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

        {/* Info (a la derecha en escritorio, sigue al hacer scroll por la descripción) */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-start lg:sticky lg:top-24">
          <nav aria-label="Ruta" className="text-xs text-zinc-500 mb-3 flex flex-wrap items-center gap-x-1.5">
            <Link href="/" className="hover:text-zinc-900">
              Inicio
            </Link>
            <span>&gt;</span>
            {categorySlug ? (
              <Link href={`/categorias/${categorySlug}`} className="hover:text-zinc-900">
                {product.category}
              </Link>
            ) : (
              <span>{product.category}</span>
            )}
            <span>&gt;</span>
            <span className="text-zinc-700">{product.name}</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 mb-4">{product.name}</h1>
          <p className="text-3xl font-medium text-zinc-950 mb-3">{formatPrice(product)}</p>
          <a href="#descripcion" className="inline-block text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-950 mb-8">
            Ver más detalles
          </a>

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

          <button
            onClick={() => {
              const missingName = product.personalizable && !customName.trim();
              const missingBusinessName = product.businessInfo && !businessName.trim();
              const missingEslogan = product.businessInfo && !eslogan.trim();
              if (missingName || missingBusinessName || missingEslogan) {
                setAttemptedSubmit(true);
                return;
              }
              const message = `¡Hola, MiMundo3D! 👋 Me interesa este producto: ${product.name} (${product.category})${
                customName.trim() ? `, nombre: ${customName.trim()}` : ''
              }${characterName.trim() ? `, personaje: ${characterName.trim()}` : ''}${
                businessName.trim() ? `, negocio/marca: ${businessName.trim()}` : ''
              }${eslogan.trim() ? `, eslogan: ${eslogan.trim()}` : ''}. ¿Me pueden dar más información?`;
              event('generate_lead', {
                method: 'whatsapp',
                source: 'catalog_product_page',
                item_name: product.name,
                item_category: product.category,
              });
              window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-[0.99] cursor-pointer"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Pedir por WhatsApp
          </button>
        </div>

        {/* Descripción */}
        <div id="descripcion" className="lg:col-start-1 lg:row-start-2 scroll-mt-24">
          <h2 className="text-lg font-bold text-zinc-950 mb-3">Descripción</h2>
          <p className="text-zinc-700 leading-relaxed whitespace-pre-line">{product.description}</p>
        </div>
      </div>
    </div>
  );
}
