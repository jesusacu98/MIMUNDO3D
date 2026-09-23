'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, ImagePlus, Loader2, Upload, Wand2, X } from 'lucide-react';
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

  const selectedDescription = IMAGE_MODELS.find((m) => m.id === modelChoice)?.description;

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {images.map((src, i) => (
            <div key={i} className="bg-white border border-zinc-200/60 rounded-2xl p-3 space-y-3">
              {/* Imágenes generadas (data URL en base64), no vienen de un dominio conocido por next/image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Variante ${i + 1}`} className="w-full aspect-square object-contain rounded-xl bg-zinc-50" />
              <a
                href={src}
                download={`diseno-${i + 1}.png`}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar
              </a>
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
    </div>
  );
}
