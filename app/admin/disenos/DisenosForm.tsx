'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, ChevronLeft, ChevronRight, Download, FileCode, ImagePlus, Loader2, Upload, Wand2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { IMAGE_MODELS, DEFAULT_IMAGE_MODEL } from '@/lib/disenos/models';

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';
const helpClass = 'mt-1.5 text-xs text-zinc-500';

const CUSTOM_MODEL = '__custom__';

interface LogoEntry {
  file: File;
  previewUrl: string;
}

interface StlState {
  status: 'loading' | 'done' | 'error';
  error?: string;
  stl?: string;
  scad?: string;
  size?: { x: number; y: number; z: number };
  warnings?: string[];
}

// El boceto llega como PNG de 1024px en base64 (varios MB); para el modelo de visión alcanza un
// JPEG más chico, y así la petición cabe sobrada en el límite de cuerpo de Vercel.
function shrinkToJpeg(dataUrl: string, maxSide = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('imagen'));
    img.src = dataUrl;
  });
}

export default function DisenosForm() {
  const [description, setDescription] = useState('');
  const [logos, setLogos] = useState<LogoEntry[]>([]);
  const logosRef = useRef<LogoEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [count, setCount] = useState(4);
  const [modelChoice, setModelChoice] = useState(DEFAULT_IMAGE_MODEL);
  const [customModel, setCustomModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [maxSizeMm, setMaxSizeMm] = useState(60);
  const [stlByIndex, setStlByIndex] = useState<Record<number, StlState>>({});

  const selectedDescription = IMAGE_MODELS.find((m) => m.id === modelChoice)?.description;

  function openLightbox(index: number) {
    setZoomed(false);
    setLightboxIndex(index);
  }

  function stepLightbox(delta: 1 | -1) {
    setZoomed(false);
    setLightboxIndex((i) => (i === null ? i : (i + delta + images.length) % images.length));
  }

  // Mientras el visor está abierto: Escape cierra, las flechas cambian de variante (arrancando sin
  // zoom cada vez), y se bloquea el scroll del fondo (mismo patrón que el menú móvil de
  // AdminSidebar.tsx).
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowLeft' && images.length > 1) stepLightbox(-1);
      else if (e.key === 'ArrowRight' && images.length > 1) stepLightbox(1);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stepLightbox es estable entre renders (no depende de estado externo salvo images.length, ya listado)
  }, [lightboxIndex, images.length]);

  // Los blob: de las vistas previas se revocan al quitar cada imagen o al desmontar, para no
  // filtrar memoria. `logosRef` mantiene el listado más reciente disponible en el cleanup final.
  useEffect(() => {
    logosRef.current = logos;
  }, [logos]);

  useEffect(() => {
    return () => {
      logosRef.current.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
    };
  }, []);

  function addLogoFiles(fileList: FileList | File[] | null) {
    if (!fileList) return;
    const newFiles = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (newFiles.length === 0) return;
    setLogos((prev) => [...prev, ...newFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  }

  function removeLogo(index: number) {
    setLogos((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);
    addLogoFiles(e.dataTransfer.files);
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }

  async function generateStl(index: number) {
    const src = images[index];
    if (!src) return;
    setStlByIndex((prev) => ({ ...prev, [index]: { status: 'loading' } }));
    try {
      const image = await shrinkToJpeg(src);
      const res = await fetch('/api/admin/disenos/stl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, description, maxSizeMm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStlByIndex((prev) => ({ ...prev, [index]: { status: 'error', error: data.error || 'No se pudo generar el STL.' } }));
        return;
      }
      setStlByIndex((prev) => ({
        ...prev,
        [index]: { status: 'done', stl: data.stl, scad: data.scad, size: data.size, warnings: data.warnings },
      }));
    } catch {
      setStlByIndex((prev) => ({ ...prev, [index]: { status: 'error', error: 'No se pudo conectar con el servidor. Intentá de nuevo.' } }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError('Describí qué querés diseñar.');
      return;
    }
    const model = modelChoice === CUSTOM_MODEL ? customModel.trim() : modelChoice;
    if (!model) {
      setError('Escribí el nombre del modelo o elegí uno de la lista.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('description', description);
      formData.set('count', String(count));
      formData.set('model', model);
      logos.forEach((entry) => formData.append('logos', entry.file));

      const res = await fetch('/api/admin/disenos/generate', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo generar el diseño.');
        return;
      }
      setImages(data.images ?? []);
      setStlByIndex({});
    } catch {
      setError('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <label htmlFor="description" className={labelClass}>
            Qué querés diseñar
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Ej: llavero con forma de gato sentado, estilo minimalista"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Imágenes de referencia (opcional)</label>
          <input
            ref={fileInputRef}
            id="logos"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              addLogoFiles(e.target.files);
              e.target.value = ''; // permite volver a elegir el mismo archivo si lo sacaste y lo querés agregar de nuevo
            }}
            className="hidden"
          />

          {logos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {logos.map((entry, i) => (
                <div key={entry.previewUrl} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.previewUrl}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover border border-zinc-200 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeLogo(i)}
                    aria-label={`Quitar ${entry.file.name}`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-700 text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            className={`mt-2 flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
            }`}
          >
            <Upload className={`w-6 h-6 ${dragActive ? 'text-primary' : 'text-zinc-400'}`} />
            <p className="text-sm text-zinc-600">
              Arrastrá imágenes acá o <span className="text-primary font-medium">hacé clic para elegirlas</span>
              {logos.length > 0 && ' — podés agregar más'}
            </p>
          </div>

          <p className={helpClass}>Podés subir varias (por ejemplo un logo y otra referencia de forma/estilo); el modelo intenta incorporar el logo en relieve/grabado sobre la pieza.</p>
        </div>

        <div>
          <label htmlFor="count" className={labelClass}>
            Cantidad de variantes
          </label>
          <select id="count" value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputClass}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="model" className={labelClass}>
            Modelo de imagen
          </label>
          <select id="model" value={modelChoice} onChange={(e) => setModelChoice(e.target.value)} className={inputClass}>
            {IMAGE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.id})
              </option>
            ))}
            <option value={CUSTOM_MODEL}>Otro (escribir el nombre)...</option>
          </select>

          {modelChoice === CUSTOM_MODEL ? (
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="nombre exacto del modelo habilitado en tu proyecto de OpenAI"
              className={`${inputClass} mt-2`}
            />
          ) : (
            <p className={helpClass}>{selectedDescription}</p>
          )}
          <p className={helpClass}>
            Tiene que estar habilitado en &quot;Allowed models&quot; de tu proyecto en platform.openai.com, si no vas a ver un error 403.
          </p>
        </div>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {loading ? 'Generando...' : 'Generar diseños'}
        </button>
      </form>

      {images.length > 0 && (
        <div className="bg-white border border-zinc-200/60 rounded-2xl p-4 sm:p-5">
          <label htmlFor="maxSize" className={labelClass}>
            Tamaño para el STL (lado más largo, en mm)
          </label>
          <input
            id="maxSize"
            type="number"
            min={10}
            max={300}
            value={maxSizeMm}
            onChange={(e) => setMaxSizeMm(Number(e.target.value))}
            className={`${inputClass} sm:max-w-40`}
          />
          <p className={helpClass}>
            &quot;Generar STL&quot; le pide a la IA que modele la pieza como código OpenSCAD con medidas exactas. Funciona bien con piezas
            geométricas (llaveros, placas, soportes); las formas orgánicas complejas salen simplificadas. Los logos y textos no se modelan.
          </p>
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.map((src, i) => (
            <div key={i} className="bg-white border border-zinc-200/60 rounded-2xl p-3 space-y-3">
              <button type="button" onClick={() => openLightbox(i)} className="block w-full cursor-zoom-in">
                {/* Imágenes generadas (data URL en base64), no vienen de un dominio conocido por next/image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Variante ${i + 1}`} className="w-full aspect-square object-contain rounded-xl bg-zinc-50" />
              </button>
              <a
                href={src}
                download={`diseno-${i + 1}.png`}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar
              </a>

              <button
                type="button"
                onClick={() => generateStl(i)}
                disabled={stlByIndex[i]?.status === 'loading' || !(maxSizeMm >= 10 && maxSizeMm <= 300)}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {stlByIndex[i]?.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
                {stlByIndex[i]?.status === 'loading' ? 'Modelando (puede tardar 1-2 min)...' : stlByIndex[i]?.status === 'done' ? 'Volver a generar STL' : 'Generar STL'}
              </button>

              {stlByIndex[i]?.status === 'error' && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{stlByIndex[i].error}</p>
              )}

              {stlByIndex[i]?.status === 'done' && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 space-y-2">
                  <p className="text-xs text-emerald-800">
                    Listo: {stlByIndex[i].size!.x.toFixed(1)} × {stlByIndex[i].size!.y.toFixed(1)} × {stlByIndex[i].size!.z.toFixed(1)} mm
                  </p>
                  {(stlByIndex[i].warnings?.length ?? 0) > 0 && (
                    <p className="text-xs text-amber-700">Avisos de OpenSCAD: {stlByIndex[i].warnings!.join(' ')} Revisá la pieza en el slicer.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`data:model/stl;base64,${stlByIndex[i].stl}`}
                      download={`diseno-${i + 1}.stl`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar STL
                    </a>
                    <a
                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(stlByIndex[i].scad ?? '')}`}
                      download={`diseno-${i + 1}.scad`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      Código .scad
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && images.length === 0 && !error && (
        <div className="border border-dashed border-zinc-200 rounded-2xl p-10 text-center text-zinc-400 flex flex-col items-center gap-2">
          <ImagePlus className="w-8 h-8" />
          <p className="text-sm">Los bocetos generados van a aparecer acá.</p>
        </div>
      )}

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxIndex(null)}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stepLightbox(-1);
                }}
                aria-label="Variante anterior"
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  stepLightbox(1);
                }}
                aria-label="Siguiente variante"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div
            className={`w-full h-full p-4 sm:p-10 flex items-center justify-center ${zoomed ? 'overflow-auto' : 'overflow-hidden'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex]}
              alt={`Variante ${lightboxIndex + 1}`}
              onClick={() => setZoomed((z) => !z)}
              className={zoomed ? 'max-w-none cursor-zoom-out' : 'max-w-full max-h-full object-contain cursor-zoom-in'}
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((z) => !z);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              {zoomed ? 'Ajustar' : 'Zoom'}
            </button>
            <a
              href={images[lightboxIndex]}
              download={`diseno-${lightboxIndex + 1}.png`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
