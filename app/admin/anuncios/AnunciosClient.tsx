'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Check, ChevronLeft, ChevronRight, Copy, Download, Loader2, Megaphone, Search, Trash2, X, ZoomIn } from 'lucide-react';
import {
  AD_FORMATS,
  AD_STYLES,
  AD_TYPES,
  formatPrice,
  getFormat,
  getStyle,
  getType,
  type AdFormatId,
  type AdOptions,
  type AdRecord,
  type AdStyleId,
  type AdTypeId,
} from '@/lib/anuncios/config';

export interface PickerProduct {
  id: string;
  name: string;
  price: number;
  isStartingPrice: boolean;
  imageUrl: string;
  category: string;
  isNew: boolean;
  isPromo: boolean;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';
const helpClass = 'mt-1.5 text-xs text-zinc-500';
const cardClass = 'bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6';

// Instagram recomienda pocos hashtags (hoy el tope sugerido es 5); Facebook rinde mejor con menos.
const INSTAGRAM_HASHTAGS = 5;
const FACEBOOK_HASHTAGS = 3;

async function downloadFile(url: string, fileName: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(href);
}

function adFileBase(ad: AdRecord): string {
  const first = (ad.productNames[0] ?? 'anuncio')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 30);
  return `mimundo3d-${ad.type}-${first || 'anuncio'}`;
}

async function downloadAll(ad: AdRecord) {
  if (ad.imageUrls.length === 1) {
    await downloadFile(ad.imageUrls[0], `${adFileBase(ad)}.png`);
    return;
  }
  const { zipSync } = await import('fflate');
  const files: Record<string, Uint8Array> = {};
  await Promise.all(
    ad.imageUrls.map(async (url, i) => {
      const buffer = await (await fetch(url)).arrayBuffer();
      files[`${adFileBase(ad)}-${String(i + 1).padStart(2, '0')}.png`] = new Uint8Array(buffer);
    }),
  );
  const zip = zipSync(files, { level: 0 });
  const href = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = href;
  a.download = `${adFileBase(ad)}.zip`;
  a.click();
  URL.revokeObjectURL(href);
}

function describeAd(ad: AdRecord): string {
  return [getType(ad.type)?.label, getStyle(ad.style)?.label, getFormat(ad.format)?.label].filter(Boolean).join(' · ');
}

export default function AnunciosClient({
  products,
  initialHistory,
  historyMissing,
  aiEnabled,
}: {
  products: PickerProduct[];
  initialHistory: AdRecord[];
  historyMissing: boolean;
  aiEnabled: boolean;
}) {
  const [type, setType] = useState<AdTypeId>('destacado');
  const [styleId, setStyleId] = useState<AdStyleId>('llamativo');
  const [formatId, setFormatId] = useState<AdFormatId>('feed');
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [options, setOptions] = useState<AdOptions & { discountPercent: number }>({ discountPercent: 15, showImageText: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState<AdRecord | null>(null);
  const [history, setHistory] = useState<AdRecord[]>(initialHistory);
  const [loadedFrom, setLoadedFrom] = useState<AdRecord | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const formTopRef = useRef<HTMLDivElement>(null);

  const typeDef = getType(type)!;
  const multi = typeDef.maxProducts > 1;
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q)));
  }, [products, query, category]);

  function pickType(next: AdTypeId) {
    setType(next);
    const def = getType(next)!;
    setSelected((prev) => prev.slice(0, def.maxProducts));
  }

  function toggleProduct(id: string) {
    setSelected((prev) => {
      if (!multi) return prev[0] === id ? [] : [id];
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return prev.length >= typeDef.maxProducts ? prev : [...prev, id];
    });
  }

  const ready = selected.length >= typeDef.minProducts && selected.length <= typeDef.maxProducts;

  // Al abrir un anuncio del historial se rellena todo el formulario con sus datos, para poder
  // ajustarlos y generar uno NUEVO a partir de ahí (el original no se modifica).
  function openFromHistory(ad: AdRecord) {
    const stillThere = new Set(products.map((p) => p.id));
    const ids = ad.productIds.filter((id) => stillThere.has(id));
    const def = getType(ad.type);
    setType(ad.type);
    setStyleId(ad.style);
    setFormatId(ad.format);
    setSelected(def ? ids.slice(0, def.maxProducts) : ids);
    setOptions({ discountPercent: 15, showImageText: true, ...ad.options });
    setQuery('');
    setCategory('');
    setError('');
    setCurrent(ad);
    setLoadedFrom(ad);
    setTimeout(() => formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  async function generate() {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/anuncios/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, style: styleId, format: formatId, productIds: selected, options }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo generar el anuncio.');
      setCurrent(data.ad as AdRecord);
      setLoadedFrom(null);
      setHistory((prev) => [data.ad as AdRecord, ...prev]);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el anuncio.');
    } finally {
      setLoading(false);
    }
  }

  async function removeAd(ad: AdRecord) {
    if (!window.confirm('¿Borrar este anuncio del historial? También se borran sus imágenes.')) return;
    const response = await fetch(`/api/admin/anuncios/${ad.id}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('No se pudo borrar el anuncio.');
      return;
    }
    setHistory((prev) => prev.filter((a) => a.id !== ad.id));
    setCurrent((prev) => (prev?.id === ad.id ? null : prev));
  }

  function onSaved(ad: AdRecord) {
    setCurrent(ad);
    setHistory((prev) => prev.map((a) => (a.id === ad.id ? ad : a)));
  }

  return (
    <div className="space-y-6">
      {historyMissing && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se encontró la tabla del historial. Corré <code className="font-mono">supabase/schema_anuncios.sql</code> en el SQL Editor de Supabase; mientras
          tanto no se podrán guardar anuncios.
        </div>
      )}
      {!aiEnabled && (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          No hay una llave de OpenAI activa (<span className="font-medium">/admin/ideas/configuracion</span>): la descripción y los hashtags se arman con una
          plantilla básica. Con la llave se escriben a medida de cada producto y estilo.
        </div>
      )}

      <div ref={formTopRef} className="scroll-mt-6" />
      {loadedFrom && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm text-zinc-700 flex flex-wrap items-center justify-between gap-3">
          <span>
            Cargaste los datos de un anuncio del historial ({describeAd(loadedFrom)}). Cámbialos si quieres y pulsa <strong>Generar anuncio</strong>: se crea uno{' '}
            <strong>nuevo</strong>, el original no se modifica.
            {loadedFrom.productIds.length > selected.length && selected.length < loadedFrom.productIds.length
              ? ' Algún producto ya no está en el catálogo y no se pudo volver a elegir.'
              : ''}
          </span>
          <button
            type="button"
            onClick={() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="text-xs font-semibold text-primary-dark hover:underline"
          >
            Ver el resultado original ↓
          </button>
        </div>
      )}

      {/* 1. Tipo */}
      <section className={cardClass}>
        <h2 className={labelClass}>1. Tipo de anuncio</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {AD_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => pickType(t.id)}
              className={`text-left p-4 rounded-xl border transition-all ${type === t.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-zinc-200 hover:border-zinc-300'}`}
            >
              <div className="font-bold text-sm text-zinc-900">{t.label}</div>
              <div className="text-xs text-zinc-500 mt-1">{t.description}</div>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Productos */}
      <section className={cardClass}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className={labelClass}>2. {multi ? `Productos (${typeDef.minProducts} a ${typeDef.maxProducts})` : 'Producto'}</h2>
          <span className="text-xs text-zinc-500">
            {selected.length} elegido{selected.length === 1 ? '' : 's'}
            {multi ? ' · el orden en que los elijas es el de las láminas' : ''}
          </span>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto…" className={inputClass + ' !mt-0 pl-9'} />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass + ' !mt-0 sm:w-56'}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[26rem] overflow-y-auto pr-1">
          {visible.map((p) => {
            const order = selected.indexOf(p.id);
            const on = order !== -1;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProduct(p.id)}
                className={`relative text-left rounded-xl border overflow-hidden transition-all ${on ? 'border-primary ring-2 ring-primary' : 'border-zinc-200 hover:border-zinc-300'}`}
              >
                <div className="relative aspect-square bg-zinc-100">
                  <Image src={p.imageUrl} alt={p.name} fill sizes="160px" className="object-cover" />
                  {on && (
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                      {multi ? order + 1 : <Check className="w-3.5 h-3.5" />}
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <div className="text-xs font-semibold text-zinc-900 line-clamp-2 leading-snug">{p.name}</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {p.isStartingPrice ? 'Desde ' : ''}
                    {formatPrice(p.price)}
                  </div>
                </div>
              </button>
            );
          })}
          {visible.length === 0 && <p className="col-span-full text-sm text-zinc-500 py-6 text-center">No hay productos con ese filtro.</p>}
        </div>
      </section>

      {/* 3. Estilo */}
      <section className={cardClass}>
        <h2 className={labelClass}>3. Estilo</h2>
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-3">
          {AD_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStyleId(s.id)}
              className={`text-left rounded-xl border overflow-hidden transition-all ${styleId === s.id ? 'border-primary ring-2 ring-primary' : 'border-zinc-200 hover:border-zinc-300'}`}
            >
              <div
                className="h-20 flex items-end p-3 gap-2"
                style={{ background: s.bg === s.bg2 ? s.bg : `linear-gradient(145deg, ${s.bg}, ${s.bg2})` }}
              >
                <span className="text-lg font-extrabold leading-none" style={{ color: s.text }}>
                  Aa
                </span>
                <span className="h-3 w-10 rounded-full" style={{ background: s.accent }} />
                <span className="h-3 w-6 rounded-full" style={{ background: s.card, opacity: 0.9 }} />
              </div>
              <div className="p-3">
                <div className="font-bold text-sm text-zinc-900">{s.label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{s.description}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Formato y opciones */}
      <section className={cardClass}>
        <h2 className={labelClass}>4. Formato y detalles</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {AD_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormatId(f.id)}
              className={`text-left p-3 rounded-xl border transition-all ${formatId === f.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-zinc-200 hover:border-zinc-300'}`}
            >
              <div className="font-bold text-sm text-zinc-900">{f.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {f.hint} · {f.width}×{f.height}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {type === 'oferta' && (
            <>
              <div>
                <label className={labelClass}>Descuento (%)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={options.discountPercent}
                  onChange={(e) => setOptions((o) => ({ ...o, discountPercent: Number(e.target.value) }))}
                  className={inputClass}
                />
                <p className={helpClass}>Se calcula sobre el precio del catálogo y se muestra el precio anterior tachado.</p>
              </div>
              <div>
                <label className={labelClass}>Vigencia (opcional)</label>
                <input
                  value={options.deadline ?? ''}
                  onChange={(e) => setOptions((o) => ({ ...o, deadline: e.target.value }))}
                  placeholder="Ej. Hasta el domingo"
                  maxLength={40}
                  className={inputClass}
                />
              </div>
            </>
          )}
          {type === 'coleccion' && (
            <div className="sm:col-span-2">
              <label className={labelClass}>Título de la portada</label>
              <input
                value={options.title ?? ''}
                onChange={(e) => setOptions((o) => ({ ...o, title: e.target.value }))}
                placeholder="Ej. Regalos para mamá"
                maxLength={80}
                className={inputClass}
              />
            </div>
          )}
          <div className="sm:col-span-2 rounded-xl border border-zinc-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.showImageText !== false}
                onChange={(e) => setOptions((o) => ({ ...o, showImageText: e.target.checked }))}
                className="mt-0.5 w-4 h-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-bold text-zinc-900">Poner un texto descriptivo en la primera imagen</span>
                <span className="block text-xs text-zinc-500 mt-0.5">
                  Mucha gente sólo mira la imagen y no lee la descripción, así que la primera lámina lleva una frase que explica qué es el producto.
                </span>
              </span>
            </label>
            {options.showImageText !== false && (
              <>
                <input
                  value={options.imageText ?? ''}
                  onChange={(e) => setOptions((o) => ({ ...o, imageText: e.target.value }))}
                  placeholder="Déjalo vacío para que lo escriba la IA, o escribe tu propia frase"
                  className={inputClass}
                />
                <p className={helpClass}>Sin límite de largo: si lo escribes tú se usa tal cual, y si es largo la letra se achica para que quepa.</p>
              </>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Indicación para el texto (opcional)</label>
            <input
              value={options.note ?? ''}
              onChange={(e) => setOptions((o) => ({ ...o, note: e.target.value }))}
              placeholder="Ej. menciona que hacemos envíos, o que es ideal para el Día del Niño"
              maxLength={300}
              className={inputClass}
            />
            <p className={helpClass}>La IA sólo usa los datos del producto y lo que escribas aquí; no inventa tiempos, medidas ni promociones.</p>
          </div>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={!ready || loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
            {loading ? 'Generando…' : 'Generar anuncio'}
          </button>
          {!ready && !loading && (
            <span className="text-xs text-zinc-500">
              {multi ? `Elegí de ${typeDef.minProducts} a ${typeDef.maxProducts} productos.` : 'Elegí un producto.'}
            </span>
          )}
          {loading && <span className="text-xs text-zinc-500">Armando las imágenes y el texto… un carrusel puede tardar hasta un minuto.</span>}
        </div>
      </section>

      {/* Resultado */}
      <div ref={resultRef} className="scroll-mt-6">
        {current && <ResultPanel key={current.id + current.createdAt} ad={current} onSaved={onSaved} />}
      </div>

      {/* Historial */}
      <section className={cardClass}>
        <h2 className={labelClass}>Historial</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Todavía no hay anuncios guardados. Los que generes aparecerán aquí para reabrirlos cuando quieras.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {history.map((ad) => (
              <div key={ad.id} className={`rounded-xl border overflow-hidden ${current?.id === ad.id ? 'border-primary ring-2 ring-primary' : 'border-zinc-200'}`}>
                <button
                  type="button"
                  onClick={() => openFromHistory(ad)}
                  className="block w-full text-left"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ad.imageUrls[0]} alt="" loading="lazy" className="w-full aspect-[4/5] object-cover bg-zinc-100" />
                  <div className="p-2">
                    <div className="text-[11px] font-bold text-zinc-900 line-clamp-1">{ad.productNames.join(', ') || 'Anuncio'}</div>
                    <div className="text-[11px] text-zinc-500 line-clamp-1">{describeAd(ad)}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(ad.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Mazatlan' })}
                      {ad.imageUrls.length > 1 ? ` · ${ad.imageUrls.length} láminas` : ''}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeAd(ad)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-zinc-500 hover:text-red-600 hover:bg-red-50 border-t border-zinc-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          window.alert('No se pudo copiar. Seleccioná el texto y copialo a mano.');
        }
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
    >
      {done ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? '¡Copiado!' : label}
    </button>
  );
}

function ResultPanel({ ad, onSaved }: { ad: AdRecord; onSaved: (ad: AdRecord) => void }) {
  const [caption, setCaption] = useState(ad.caption);
  const [whatsapp, setWhatsapp] = useState(ad.whatsappText);
  const [tags, setTags] = useState(ad.hashtags);
  const [on, setOn] = useState<Set<string>>(() => new Set(ad.hashtags.slice(0, INSTAGRAM_HASHTAGS)));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState<number | null>(null);

  const chosen = tags.filter((t) => on.has(t));
  const instagramText = [caption.trim(), chosen.join(' ')].filter(Boolean).join('\n\n');
  const facebookText = [caption.trim(), chosen.slice(0, FACEBOOK_HASHTAGS).join(' ')].filter(Boolean).join('\n\n');

  function toggleTag(tag: string) {
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/anuncios/${ad.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption, whatsappText: whatsapp, hashtags: chosen }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar.');
      setTags(chosen);
      setOn(new Set(chosen));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved(data.ad as AdRecord);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function download() {
    setDownloading(true);
    try {
      await downloadAll(ad);
    } catch {
      setError('No se pudieron descargar las imágenes.');
    } finally {
      setDownloading(false);
    }
  }

  const format = getFormat(ad.format);
  const vertical = format?.id === 'historia';

  return (
    <section className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={labelClass}>Resultado</h2>
          <p className="text-sm text-zinc-600 mt-1">{describeAd(ad)}</p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors disabled:opacity-60"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {ad.imageUrls.length > 1 ? `Descargar ${ad.imageUrls.length} imágenes (ZIP)` : 'Descargar imagen'}
        </button>
      </div>

      <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
        {ad.imageUrls.map((url, i) => (
          <div key={url} className="shrink-0 group relative">
            <button type="button" onClick={() => setZoom(i)} className="block cursor-zoom-in" title="Ver en grande">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Lámina ${i + 1}`} className={`rounded-xl border border-zinc-200 shadow-sm ${vertical ? 'h-96' : 'h-80'} w-auto`} />
            </button>
            <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => setZoom(i)}
                className="p-2 rounded-lg bg-white/90 hover:bg-white shadow text-zinc-700"
                title="Ver en grande"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => downloadFile(url, `${adFileBase(ad)}-${String(i + 1).padStart(2, '0')}.png`)}
                className="p-2 rounded-lg bg-white/90 hover:bg-white shadow text-zinc-700"
                title="Descargar esta lámina"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>Descripción</label>
          {ad.variants.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {ad.variants.map((v) => (
                <button
                  key={v.label}
                  type="button"
                  onClick={() => setCaption(v.text)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${caption === v.text ? 'bg-primary text-white border-primary' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={9} className={inputClass + ' resize-y'} />
          <p className={helpClass}>Editá lo que quieras. Los hashtags se agregan abajo al copiar, no van dentro de este cuadro.</p>

          <div className="mt-5">
            <label className={labelClass}>Hashtags</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTag(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${on.has(t) ? 'bg-primary/10 text-primary-dark border-primary' : 'border-zinc-200 text-zinc-400 line-through'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className={helpClass}>
              Tocá un hashtag para quitarlo o ponerlo. Instagram rinde mejor con pocos relevantes (hasta {INSTAGRAM_HASHTAGS}); en Facebook se usan los primeros{' '}
              {FACEBOOK_HASHTAGS}. Llevas {chosen.length} elegido{chosen.length === 1 ? '' : 's'}.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <PasteBlock title="Instagram" text={instagramText} note={chosen.length > INSTAGRAM_HASHTAGS ? `Tienes ${chosen.length} hashtags; para Instagram conviene dejar ${INSTAGRAM_HASHTAGS}.` : undefined} />
          <PasteBlock title="Facebook" text={facebookText} />
          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-zinc-900">WhatsApp (estado o chat)</span>
              <CopyButton text={whatsapp} />
            </div>
            <textarea value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} rows={4} className={inputClass + ' !mt-0 resize-y'} />
          </div>
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-300 hover:border-zinc-900 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-green-600" /> : null}
          {saved ? 'Guardado' : 'Guardar cambios en el historial'}
        </button>
      </div>
      {zoom !== null && <Lightbox ad={ad} index={zoom} onChange={setZoom} onClose={() => setZoom(null)} />}
    </section>
  );
}

function PasteBlock({ title, text, note }: { title: string; text: string; note?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-zinc-900">{title}</span>
        <CopyButton text={text} />
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-zinc-700 max-h-56 overflow-y-auto">{text || '—'}</pre>
      {note && <p className="mt-2 text-xs text-amber-700">{note}</p>}
    </div>
  );
}

// Visor a pantalla completa: flechas del teclado para cambiar de lámina, Esc para cerrar.
function Lightbox({ ad, index, onChange, onClose }: { ad: AdRecord; index: number; onChange: (i: number) => void; onClose: () => void }) {
  const total = ad.imageUrls.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onChange((index + 1) % total);
      else if (e.key === 'ArrowLeft') onChange((index - 1 + total) % total);
    }
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, total, onChange, onClose]);

  const nav = 'absolute top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 sm:p-8" onClick={onClose} role="dialog" aria-modal="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.imageUrls[index]}
        alt={`Lámina ${index + 1} de ${total}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
      />
      <div className="absolute top-4 right-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {total > 1 && (
          <span className="text-sm font-semibold text-white/90 px-3 py-1.5 rounded-full bg-white/15">
            {index + 1} / {total}
          </span>
        )}
        <button
          type="button"
          onClick={() => downloadFile(ad.imageUrls[index], `${adFileBase(ad)}-${String(index + 1).padStart(2, '0')}.png`)}
          className="p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors"
          title="Descargar esta lámina"
        >
          <Download className="w-5 h-5" />
        </button>
        <button type="button" onClick={onClose} className="p-2.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors" title="Cerrar (Esc)">
          <X className="w-5 h-5" />
        </button>
      </div>
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange((index - 1 + total) % total);
            }}
            className={nav + ' left-3 sm:left-6'}
            title="Anterior"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange((index + 1) % total);
            }}
            className={nav + ' right-3 sm:right-6'}
            title="Siguiente"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </>
      )}
    </div>
  );
}
