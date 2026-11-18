'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Box, Camera, ChevronLeft, ChevronRight, Download, FileCode, History, ImagePlus, Link2, Loader2, Ruler, PenTool, Pencil, Trash2, Upload, Wand2, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { DesignRecord } from '@/lib/disenos/history';
import type { Palette } from '@/lib/disenos/variants';
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

interface FusionState {
  status: 'loading' | 'done' | 'error';
  error?: string;
  png?: string;
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

// Las imágenes guardadas viven en Storage; se bajan a data URL para que el visor, la descarga y el
// reescalado (canvas) funcionen igual que con una generación recién hecha.
async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('imagen');
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('imagen'));
    reader.readAsDataURL(blob);
  });
}

interface TraceState {
  status: 'loading' | 'done' | 'error';
  error?: string;
  png?: string;
  svg?: string;
  ratio?: number;
}

// "Trazado exacto": traza la foto sin IA de imagen (ruta /api/admin/disenos/trace). Es una
// función aparte de "Imagen para Fusion"; no comparte estado ni ruta con ella.
async function requestExactTrace(src: string): Promise<TraceState> {
  try {
    const image = await shrinkToJpeg(src, 1536);
    const res = await fetch('/api/admin/disenos/trace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    const data = await res.json();
    if (!res.ok) return { status: 'error', error: data.error || 'No se pudo trazar la imagen.' };
    return { status: 'done', png: data.png, svg: data.svg, ratio: data.ratio };
  } catch {
    return { status: 'error', error: 'No se pudo conectar con el servidor. Intentá de nuevo.' };
  }
}

function TraceResult({ state, name }: { state: TraceState | undefined; name: string }) {
  if (!state || state.status === 'loading') return null;
  if (state.status === 'error') return <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>;
  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 space-y-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${state.png}`} alt="Trazado exacto" className="w-full max-h-72 object-contain rounded-lg bg-white border border-zinc-200" />
      <p className="text-xs text-sky-900">
        Trazado directo de la foto, sin redibujar{state.ratio ? ` (ancho ÷ alto de la pieza: ${state.ratio.toFixed(2)})` : ''}. No se guarda en el historial: descargalo.
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`data:image/png;base64,${state.png}`}
          download={`${name}-trazado.png`}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Descargar PNG
        </a>
        <a
          href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(state.svg ?? '')}`}
          download={`${name}-trazado.svg`}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sky-300 text-sky-900 hover:bg-sky-100 text-xs font-semibold transition-colors"
        >
          <FileCode className="w-3.5 h-3.5" />
          Descargar SVG (vectorial)
        </a>
      </div>
    </div>
  );
}

// Trabaja sobre una imagen que el usuario ya tiene (hecha en otra herramienta): la convierte en el
// PNG para Fusion o la modifica con una instrucción, con las mismas rutas y prompts que los bocetos
// generados aquí. No se guarda en el historial.
function ConvertUploadedImage({ model, kind }: { model: string; kind: 'expositor' | 'libre' }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [state, setState] = useState<FusionState | null>(null);
  const [modify, setModify] = useState<ModifyState>({ open: false, text: '', status: 'idle' });
  const [modified, setModified] = useState<string[]>([]);
  const [trace, setTrace] = useState<TraceState | null>(null);

  const busy = state?.status === 'loading' || modify.status === 'loading' || trace?.status === 'loading';

  function setAsSource(dataUrl: string) {
    setSource(dataUrl);
    setState(null);
    setTrace(null);
    setModify((prev) => ({ ...prev, status: 'idle', error: undefined }));
  }

  function loadFile(file: File | undefined) {
    if (busy || !file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAsSource(String(reader.result));
      setModified([]);
    };
    reader.readAsDataURL(file);
  }

  async function convert(strict = false) {
    if (!source) return;
    if (!model) {
      setState({ status: 'error', error: 'Elegí o escribí un modelo de imagen en el formulario de arriba.' });
      return;
    }
    setState({ status: 'loading' });
    try {
      const image = await shrinkToJpeg(source, 1536);
      const res = await fetch('/api/admin/disenos/fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, model, strict }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ status: 'error', error: data.error || 'No se pudo preparar la imagen.' });
        return;
      }
      setState({ status: 'done', png: data.png });
    } catch {
      setState({ status: 'error', error: 'No se pudo conectar con el servidor. Intentá de nuevo.' });
    }
  }

  async function exactTrace() {
    if (!source) return;
    setTrace({ status: 'loading' });
    setTrace(await requestExactTrace(source));
  }

  // Igual que "Modificar diseño" de los bocetos: genera una variante nueva y conserva la original.
  async function applyModify() {
    const text = modify.text.trim();
    if (!source) return;
    if (!text) {
      setModify((prev) => ({ ...prev, status: 'error', error: 'Escribí qué querés cambiar del diseño.' }));
      return;
    }
    if (!model) {
      setModify((prev) => ({ ...prev, status: 'error', error: 'Elegí o escribí un modelo de imagen en el formulario de arriba.' }));
      return;
    }
    setModify((prev) => ({ ...prev, status: 'loading', error: undefined }));
    try {
      const image = await shrinkToJpeg(source, 1536);
      const res = await fetch('/api/admin/disenos/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, instructions: text, model, kind }),
      });
      const data = await res.json();
      if (!res.ok || !data.image) {
        setModify((prev) => ({ ...prev, status: 'error', error: data.error || 'No se pudo modificar el diseño.' }));
        return;
      }
      setModified((prev) => [...prev, data.image]);
      setModify({ open: false, text: '', status: 'idle' });
    } catch {
      setModify((prev) => ({ ...prev, status: 'error', error: 'No se pudo conectar con el servidor. Intentá de nuevo.' }));
    }
  }

  return (
    <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">Convertir una imagen que ya tengo</h2>
        <p className={helpClass}>
          Subí un diseño hecho en otra herramienta y después elegí qué hacer con él: convertirlo en el PNG blanco y negro para Fusion, trazarlo de forma exacta o modificarlo con una instrucción (Fusion y modificar usan el modelo de imagen elegido arriba). No se guarda en el historial.
        </p>
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ''; }} />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); loadFile(e.dataTransfer.files[0]); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
        }`}
      >
        {source ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source} alt="Imagen cargada" className="max-h-56 object-contain rounded-lg" />
        ) : (
          <Upload className={`w-6 h-6 ${dragActive ? 'text-primary' : 'text-zinc-400'}`} />
        )}
        <p className="text-sm text-zinc-600">
          {source ? 'Hacé clic o arrastrá otra para cambiarla' : <>Arrastrá una imagen acá o <span className="text-primary font-medium">hacé clic para elegirla</span></>}
        </p>
      </div>

      {source && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => convert()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-900 text-zinc-900 hover:bg-zinc-50 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {state?.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
            {state?.status === 'loading' ? 'Preparando (puede tardar 1 min)...' : 'Imagen para Fusion'}
          </button>
          <button
            type="button"
            onClick={() => convert(true)}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-900 text-zinc-900 hover:bg-zinc-50 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <PenTool className="w-4 h-4" />
            Imagen para Fusion (proporciones estrictas)
          </button>
          <button
            type="button"
            onClick={exactTrace}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-sky-700 text-sky-800 hover:bg-sky-50 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {trace?.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ruler className="w-4 h-4" />}
            {trace?.status === 'loading' ? 'Trazando (unos segundos)...' : 'Trazado exacto'}
          </button>
          <button
            type="button"
            onClick={() => setModify((prev) => ({ ...prev, open: !prev.open }))}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-primary text-primary hover:bg-primary/5 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Pencil className="w-4 h-4" />
            Modificar diseño
          </button>
        </div>
      )}

      {source && modify.open && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 space-y-2">
          <label htmlFor="modify-upload" className={labelClass}>
            Qué querés cambiar
          </label>
          <textarea
            id="modify-upload"
            value={modify.text}
            onChange={(e) => setModify((prev) => ({ ...prev, text: e.target.value }))}
            rows={4}
            maxLength={1000}
            placeholder="Ej: agregá una taza de café a la izquierda y cambiá la base a color negro"
            className={inputClass}
          />
          <p className={helpClass}>
            Se genera una variante nueva con el cambio; tu imagen original se conserva. Usa el modelo de imagen y el tipo de diseño elegidos arriba.
          </p>
          {modify.status === 'error' && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{modify.error}</p>}
          <button
            type="button"
            onClick={applyModify}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white text-sm font-semibold shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {modify.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {modify.status === 'loading' ? 'Modificando (puede tardar 1 min)...' : 'Aplicar cambio'}
          </button>
        </div>
      )}

      {state?.status === 'error' && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>}

      {state?.status === 'done' && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${state.png}`} alt="Arte lineal para Fusion" className="w-full max-h-72 object-contain rounded-lg bg-white border border-zinc-200" />
          <a
            href={`data:image/png;base64,${state.png}`}
            download="imagen-fusion.png"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar PNG para Fusion
          </a>
        </div>
      )}

      <TraceResult state={trace ?? undefined} name="imagen" />

      {modified.length > 0 && (
        <div className="space-y-2">
          <p className={labelClass}>Variantes modificadas</p>
          <p className={helpClass}>No se guardan: descargá las que te sirvan. Con &quot;Usar esta imagen&quot; la variante pasa a ser la imagen cargada, para convertirla a Fusion o seguir modificándola.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {modified.map((src, i) => (
              <div key={i} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Variante modificada ${i + 1}`} className="w-full max-h-72 object-contain rounded-lg bg-white border border-zinc-200" />
                <div className="flex flex-wrap gap-2">
                  <a
                    href={src}
                    download={`imagen-modificada-${i + 1}.png`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </a>
                  <button
                    type="button"
                    onClick={() => setAsSource(src)}
                    disabled={busy || source === src}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary text-primary hover:bg-primary/5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {source === src ? 'En uso' : 'Usar esta imagen'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ModifyState {
  open: boolean;
  text: string;
  status: 'idle' | 'loading' | 'error';
  error?: string;
}

interface OrderOption {
  id: string;
  /** "Cliente · fecha · estatus", para reconocer el pedido en el desplegable. */
  label: string;
}

// Selector de UNA imagen (diseño base / logo del modo "Variantes de colores"): clic o arrastrar.
function SingleImagePicker({ id, label, help, file, onChange }: { id: string; label: string; help: string; file: File | null; onChange: (file: File | null) => void }) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function pick(list: FileList | null) {
    const picked = list ? Array.from(list).find((f) => f.type.startsWith('image/')) : undefined;
    if (picked) onChange(picked);
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input ref={inputRef} id={id} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
        className={`mt-2 flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${over ? 'border-primary bg-primary/5' : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="w-20 h-20 rounded-lg object-contain border border-zinc-200 bg-white" />
        ) : (
          <Upload className="w-6 h-6 text-zinc-400 mx-3" />
        )}
        <p className="text-sm text-zinc-600 flex-1">
          {file ? file.name : <>Arrastrá la imagen acá o <span className="text-primary font-medium">hacé clic para elegirla</span></>}
        </p>
        {file && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null); }} aria-label="Quitar imagen" className="w-6 h-6 rounded-full bg-zinc-700 text-white flex items-center justify-center hover:bg-red-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className={helpClass}>{help}</p>
    </div>
  );
}

export default function DisenosForm({
  initialHistory,
  historyMissing,
  orders,
}: {
  initialHistory: DesignRecord[];
  historyMissing: boolean;
  orders: OrderOption[];
}) {
  const [history, setHistory] = useState<DesignRecord[]>(initialHistory);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<'custom' | 'variants'>('custom');
  const [variantBase, setVariantBase] = useState<File | null>(null);
  const [variantLogo, setVariantLogo] = useState<File | null>(null);
  const [variantNotes, setVariantNotes] = useState('');
  // Paletas de la última tanda de variantes (una por imagen); vacío si la generación no es de ese modo.
  const [palettes, setPalettes] = useState<Palette[]>([]);
  const [kind, setKind] = useState<'expositor' | 'libre'>('expositor');
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
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
  const [fusionByIndex, setFusionByIndex] = useState<Record<number, FusionState>>({});
  const [traceByIndex, setTraceByIndex] = useState<Record<number, TraceState>>({});

  const [modifyByIndex, setModifyByIndex] = useState<Record<number, ModifyState>>({});
  // Índice de la variante con el panel "Vincular a pedido" abierto.
  const [linkIndex, setLinkIndex] = useState<number | null>(null);
  const [linkChoice, setLinkChoice] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const currentDesign = history.find((d) => d.id === currentDesignId) ?? null;
  const orderLabel = (orderId: string) => orders.find((o) => o.id === orderId)?.label ?? 'Pedido vinculado';

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

  async function generateFusionImage(index: number) {
    const src = images[index];
    if (!src) return;
    setFusionByIndex((prev) => ({ ...prev, [index]: { status: 'loading' } }));
    try {
      const image = await shrinkToJpeg(src, 1536);
      const res = await fetch('/api/admin/disenos/fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          model: modelChoice === CUSTOM_MODEL ? customModel.trim() : modelChoice,
          designId: currentDesignId,
          index,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFusionByIndex((prev) => ({ ...prev, [index]: { status: 'error', error: data.error || 'No se pudo preparar la imagen.' } }));
        return;
      }
      setFusionByIndex((prev) => ({ ...prev, [index]: { status: 'done', png: data.png } }));
      if (currentDesignId && data.url) {
        setHistory((prev) =>
          prev.map((d) => (d.id === currentDesignId ? { ...d, fusionUrls: { ...d.fusionUrls, [String(index)]: data.url } } : d)),
        );
      }
    } catch {
      setFusionByIndex((prev) => ({ ...prev, [index]: { status: 'error', error: 'No se pudo conectar con el servidor. Intentá de nuevo.' } }));
    }
  }

  async function generateExactTrace(index: number) {
    const src = images[index];
    if (!src) return;
    setTraceByIndex((prev) => ({ ...prev, [index]: { status: 'loading' } }));
    const result = await requestExactTrace(src);
    setTraceByIndex((prev) => ({ ...prev, [index]: result }));
  }

  function patchModify(index: number, patch: Partial<ModifyState>) {
    setModifyByIndex((prev) => {
      const base: ModifyState = prev[index] ?? { open: false, text: '', status: 'idle' };
      return { ...prev, [index]: { ...base, ...patch } };
    });
  }

  // La variante modificada se agrega al final de la misma generación (la original se conserva).
  async function modifyDesign(index: number, frontal = false) {
    const src = images[index];
    const text = modifyByIndex[index]?.text.trim();
    if (!src || (!frontal && !text)) {
      patchModify(index, { status: 'error', error: 'Escribí qué querés cambiar del diseño.' });
      return;
    }
    const model = modelChoice === CUSTOM_MODEL ? customModel.trim() : modelChoice;
    if (!model) {
      patchModify(index, { status: 'error', error: 'Escribí el nombre del modelo o elegí uno de la lista.' });
      return;
    }
    patchModify(index, { status: 'loading', error: undefined });
    try {
      const image = await shrinkToJpeg(src, 1536);
      const res = await fetch('/api/admin/disenos/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, instructions: text, frontal, model, kind, designId: currentDesignId }),
      });
      const data = await res.json();
      if (!res.ok) {
        patchModify(index, { status: 'error', error: data.error || 'No se pudo modificar el diseño.' });
        return;
      }
      if (data.design) {
        const design: DesignRecord = data.design;
        const added = await urlToDataUrl(design.imageUrls[design.imageUrls.length - 1]);
        setImages((prev) => [...prev, added]);
        setHistory((prev) => prev.map((d) => (d.id === design.id ? design : d)));
      } else {
        setImages((prev) => [...prev, data.image]);
        if (!historyMissing) setNotice('No se pudo guardar la modificación en el historial; descargala antes de refrescar.');
      }
      patchModify(index, frontal ? { status: 'idle' } : { open: false, text: '', status: 'idle' });
    } catch {
      patchModify(index, { status: 'error', error: 'No se pudo conectar con el servidor. Intentá de nuevo.' });
    }
  }

  // Vincula una variante de la generación abierta a un pedido (o quita el vínculo con null). Cada
  // generación tiene una sola variante vinculada: la que eligió el cliente.
  async function linkToOrder(orderId: string | null, variant: number) {
    if (!currentDesignId) return;
    setLinkSaving(true);
    setLinkError(null);
    try {
      const res = await fetch(`/api/admin/disenos/${currentDesignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, variant }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLinkError(data.error || 'No se pudo vincular el diseño al pedido.');
        return;
      }
      setHistory((prev) => prev.map((d) => (d.id === currentDesignId ? { ...d, orderId, orderVariant: orderId ? variant : null } : d)));
      setLinkIndex(null);
    } catch {
      setLinkError('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setLinkSaving(false);
    }
  }

  async function openDesign(design: DesignRecord) {
    setOpeningId(design.id);
    setError(null);
    try {
      const fusionEntries = Object.entries(design.fusionUrls);
      const [loaded, fusionLoaded] = await Promise.all([
        Promise.all(design.imageUrls.map(urlToDataUrl)),
        Promise.all(fusionEntries.map(([, url]) => urlToDataUrl(url))),
      ]);
      setKind(design.kind);
      setPalettes([]);
      setDescription(design.description);
      setImages(loaded);
      setCurrentDesignId(design.id);
      setLinkIndex(null);
      setLinkError(null);
      setTraceByIndex({});
      setStlByIndex({});
      setModifyByIndex({});
      const restored: Record<number, FusionState> = {};
      fusionEntries.forEach(([index], n) => {
        restored[Number(index)] = { status: 'done', png: fusionLoaded[n].slice(fusionLoaded[n].indexOf(',') + 1) };
      });
      setFusionByIndex(restored);
      setNotice(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setError('No se pudieron cargar las imágenes de ese diseño.');
    } finally {
      setOpeningId(null);
    }
  }

  async function deleteDesign(design: DesignRecord) {
    if (!window.confirm('¿Borrar este diseño del historial? Se borran también sus imágenes.')) return;
    const res = await fetch(`/api/admin/disenos/${design.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError('No se pudo borrar el diseño.');
      return;
    }
    setHistory((prev) => prev.filter((d) => d.id !== design.id));
    if (currentDesignId === design.id) setCurrentDesignId(null);
  }

  async function handleVariantsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!variantBase || !variantLogo) {
      setError('Subí el diseño base y el logo del cliente.');
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
      formData.set('base', variantBase);
      formData.set('logo', variantLogo);
      formData.set('notes', variantNotes);
      formData.set('count', String(count));
      formData.set('model', model);
      const res = await fetch('/api/admin/disenos/variants', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudieron generar las variantes.');
        return;
      }
      setNotice(null);
      setPalettes(data.palettes ?? []);
      if (data.design) {
        const design: DesignRecord = data.design;
        setImages(await Promise.all(design.imageUrls.map(urlToDataUrl)));
        setCurrentDesignId(design.id);
        setDescription(design.description);
        setHistory((prev) => [design, ...prev]);
      } else {
        setImages(data.images ?? []);
        setCurrentDesignId(null);
        if (!historyMissing) setNotice('No se pudo guardar esta generación en el historial; descargá lo que te sirva antes de refrescar.');
      }
      setKind('expositor');
      setStlByIndex({});
      setFusionByIndex({});
      setTraceByIndex({});
      setModifyByIndex({});
      setLinkIndex(null);
      setLinkError(null);
    } catch {
      setError('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setLoading(false);
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
      formData.set('kind', kind);
      formData.set('orientation', orientation);
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
      setNotice(null);
      if (data.design) {
        const design: DesignRecord = data.design;
        setImages(await Promise.all(design.imageUrls.map(urlToDataUrl)));
        setCurrentDesignId(design.id);
        setHistory((prev) => [design, ...prev]);
      } else {
        setImages(data.images ?? []);
        setCurrentDesignId(null);
        if (!historyMissing) setNotice('No se pudo guardar esta generación en el historial; descargá lo que te sirva antes de refrescar.');
      }
      setPalettes([]);
      setStlByIndex({});
      setFusionByIndex({});
      setTraceByIndex({});
      setModifyByIndex({});
      setLinkIndex(null);
      setLinkError(null);
    } catch {
      setError('No se pudo conectar con el servidor. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="tablist" aria-label="Modo del generador">
        {([
          ['custom', 'Diseño personalizado', 'Diseñar una pieza desde cero a partir de una descripción.'],
          ['variants', 'Variantes de colores', 'Tomar un diseño ya establecido y combinar colores según el logo del cliente.'],
        ] as const).map(([id, title, hint]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => { setMode(id); setError(null); }}
            className={`text-left rounded-2xl border px-4 py-3 transition-colors cursor-pointer ${mode === id ? 'border-primary bg-primary/5' : 'border-zinc-200/60 bg-white hover:border-zinc-300'}`}
          >
            <span className={`block text-sm font-semibold ${mode === id ? 'text-primary' : 'text-zinc-800'}`}>{title}</span>
            <span className="block text-xs text-zinc-500 mt-0.5">{hint}</span>
          </button>
        ))}
      </div>

      {mode === 'variants' && (
        <form onSubmit={handleVariantsSubmit} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-6">
          <SingleImagePicker
            id="variant-base"
            label="Diseño base"
            help="La foto o imagen de uno de tus expositores ya hechos. Se conserva igual (forma, íconos, QR, textos); sólo cambian los colores y el logo."
            file={variantBase}
            onChange={setVariantBase}
          />
          <SingleImagePicker
            id="variant-logo"
            label="Logo del cliente"
            help="De aquí salen las paletas: la primera usa los colores del logo y las demás son combinaciones con ellos."
            file={variantLogo}
            onChange={setVariantLogo}
          />
          <div>
            <label htmlFor="variant-notes" className={labelClass}>
              Indicaciones (opcional)
            </label>
            <textarea
              id="variant-notes"
              value={variantNotes}
              onChange={(e) => setVariantNotes(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Ej: que la placa sea clara, nada de rojo, la base siempre negra"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="variant-count" className={labelClass}>
              Cantidad de combinaciones
            </label>
            <select id="variant-count" value={count} onChange={(e) => setCount(Number(e.target.value))} className={inputClass}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="variant-model" className={labelClass}>
              Modelo de imagen
            </label>
            <select id="variant-model" value={modelChoice} onChange={(e) => setModelChoice(e.target.value)} className={inputClass}>
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id})
                </option>
              ))}
              <option value={CUSTOM_MODEL}>Otro (escribir el nombre)...</option>
            </select>
            {modelChoice === CUSTOM_MODEL && (
              <input type="text" value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="nombre exacto del modelo" className={`${inputClass} mt-2`} />
            )}
            <p className={helpClass}>Tiene que ser de la familia gpt-image (edita con imágenes de referencia). Cada combinación cuesta una imagen.</p>
          </div>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {loading ? 'Generando combinaciones (puede tardar 1-2 min)...' : 'Generar combinaciones'}
          </button>
        </form>
      )}

      {mode === 'custom' && (
      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <label htmlFor="kind" className={labelClass}>
            Tipo de diseño
          </label>
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as 'expositor' | 'libre')} className={inputClass}>
            <option value="expositor">Expositor con QR y redes (foto realista)</option>
            <option value="libre">Libre (boceto de pieza imprimible)</option>
          </select>
        </div>

        {kind === 'expositor' && (
          <div>
            <label htmlFor="orientation" className={labelClass}>
              Orientación
            </label>
            <select id="orientation" value={orientation} onChange={(e) => setOrientation(e.target.value as 'vertical' | 'horizontal')} className={inputClass}>
              <option value="vertical">Vertical (más alto que ancho)</option>
              <option value="horizontal">Horizontal (más ancho que alto)</option>
            </select>
            <p className={helpClass}>Define la forma de la placa y el formato de la foto. Las imágenes para Fusion y las modificaciones respetan la forma de cada boceto.</p>
          </div>
        )}

        <div>
          <label htmlFor="description" className={labelClass}>
            Qué querés diseñar
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder={
              kind === 'expositor'
                ? 'Ej: expositor para barbería «The Capitan», placa redonda blanca con borde cobre, tijeras decorativas a la izquierda, íconos de Facebook, Instagram y Wi-Fi con sus QR, base negra'
                : 'Ej: llavero con forma de gato sentado, estilo minimalista'
            }
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
      )}

      {mode === 'custom' && <ConvertUploadedImage model={modelChoice === CUSTOM_MODEL ? customModel.trim() : modelChoice} kind={kind} />}

      {notice &&<p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>}
      {historyMissing && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          El historial no está activo: falta correr <code>supabase/schema_disenos.sql</code> en el SQL Editor de Supabase. Mientras tanto, lo que generes se pierde al refrescar.
        </p>
      )}

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

      {palettes.length > 0 && palettes.length === images.length && (
        <div className="bg-white border border-zinc-200/60 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {palettes.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-800 w-5">{i + 1}</span>
              <div className="flex gap-1" title="Colores de la pieza: placa, textos, íconos y base">
                {[p.plate, p.relief, p.accent, p.base].map((c, j) => (
                  <span key={j} title={c} style={{ backgroundColor: c }} className="w-6 h-6 rounded-md border border-zinc-200" />
                ))}
              </div>
              <div className="flex gap-1 pl-2 border-l border-zinc-200" title="Colores del logo (no cambian)">
                {p.logo.map((c, j) => (
                  <span key={j} title={c} style={{ backgroundColor: c }} className="w-4 h-4 rounded-full border border-zinc-200 self-center" />
                ))}
              </div>
              <span className="text-sm text-zinc-700">{p.name}</span>
            </div>
          ))}
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

              {currentDesign && (() => {
                const linkedHere = Boolean(currentDesign.orderId) && currentDesign.orderVariant === i;
                return (
                  <>
                    {linkedHere && (
                      <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-zinc-700">
                        Variante elegida para el pedido:{' '}
                        <Link href={`/admin/pedidos/${currentDesign.orderId}/editar`} className="text-primary font-semibold hover:underline">
                          {orderLabel(currentDesign.orderId!)}
                        </Link>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setLinkChoice(currentDesign.orderId ?? '');
                        setLinkError(null);
                        setLinkIndex((open) => (open === i ? null : i));
                      }}
                      className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary/5 text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <Link2 className="w-4 h-4" />
                      {linkedHere ? 'Cambiar pedido' : 'Vincular a pedido'}
                    </button>

                    {linkIndex === i && (
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 space-y-2">
                        <label htmlFor={`link-order-${i}`} className={labelClass}>
                          Elegí el pedido
                        </label>
                        <select id={`link-order-${i}`} value={linkChoice} onChange={(e) => setLinkChoice(e.target.value)} className={inputClass}>
                          <option value="">Seleccioná un pedido...</option>
                          {orders.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        {orders.length === 0 && <p className={helpClass}>Todavía no hay pedidos cargados.</p>}
                        <p className={helpClass}>
                          Se vincula sólo esta variante.
                          {currentDesign.orderId && !linkedHere && ' Reemplaza a la variante de este diseño que estaba vinculada antes.'}
                        </p>
                        {linkError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{linkError}</p>}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => linkToOrder(linkChoice, i)}
                            disabled={!linkChoice || linkSaving}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white text-sm font-semibold shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {linkSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                            Guardar vínculo
                          </button>
                          {linkedHere && (
                            <button
                              type="button"
                              onClick={() => linkToOrder(null, i)}
                              disabled={linkSaving}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-white text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Quitar vínculo
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <button
                type="button"
                onClick={() => patchModify(i, { open: !modifyByIndex[i]?.open })}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary/5 text-sm font-semibold transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                Modificar diseño
              </button>

              {kind === 'expositor' && (
                <button
                  type="button"
                  onClick={() => modifyDesign(i, true)}
                  disabled={modifyByIndex[i]?.status === 'loading'}
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-primary text-primary hover:bg-primary/5 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {modifyByIndex[i]?.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {modifyByIndex[i]?.status === 'loading' ? 'Procesando (puede tardar 1 min)...' : 'Regenerar en vista frontal'}
                </button>
              )}

              {!modifyByIndex[i]?.open && modifyByIndex[i]?.status === 'error' && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{modifyByIndex[i].error}</p>
              )}

              {modifyByIndex[i]?.open && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 space-y-2">
                  <label htmlFor={`modify-${i}`} className={labelClass}>
                    Qué querés cambiar
                  </label>
                  <textarea
                    id={`modify-${i}`}
                    value={modifyByIndex[i].text}
                    onChange={(e) => patchModify(i, { text: e.target.value })}
                    rows={4}
                    placeholder="Ej: agregá una taza de café a la izquierda y cambiá la base a color negro"
                    className={inputClass}
                  />
                  <p className={helpClass}>Se genera una variante nueva con el cambio; la original se conserva. Usa el modelo de imagen elegido arriba.</p>
                  {modifyByIndex[i].status === 'error' && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{modifyByIndex[i].error}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => modifyDesign(i)}
                    disabled={modifyByIndex[i].status === 'loading'}
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white text-sm font-semibold shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {modifyByIndex[i].status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {modifyByIndex[i].status === 'loading' ? 'Modificando (puede tardar 1 min)...' : 'Aplicar cambio'}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => generateStl(i)}
                disabled={stlByIndex[i]?.status === 'loading' || !(maxSizeMm >= 10 && maxSizeMm <= 300)}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {stlByIndex[i]?.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />}
                {stlByIndex[i]?.status === 'loading' ? 'Modelando (puede tardar 1-2 min)...' : stlByIndex[i]?.status === 'done' ? 'Volver a generar STL' : 'Generar STL'}
              </button>

              <button
                type="button"
                onClick={() => generateFusionImage(i)}
                disabled={fusionByIndex[i]?.status === 'loading'}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-zinc-900 text-zinc-900 hover:bg-zinc-50 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {fusionByIndex[i]?.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                {fusionByIndex[i]?.status === 'loading' ? 'Preparando (puede tardar 1 min)...' : fusionByIndex[i]?.status === 'done' ? 'Volver a preparar para Fusion' : 'Imagen para Fusion'}
              </button>

              {fusionByIndex[i]?.status === 'error' && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{fusionByIndex[i].error}</p>
              )}

              {fusionByIndex[i]?.status === 'done' && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/png;base64,${fusionByIndex[i].png}`} alt="Arte lineal para Fusion" className="w-full max-h-72 object-contain rounded-lg bg-white border border-zinc-200" />
                  <a
                    href={`data:image/png;base64,${fusionByIndex[i].png}`}
                    download={`diseno-${i + 1}-fusion.png`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar PNG para Fusion
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={() => generateExactTrace(i)}
                disabled={traceByIndex[i]?.status === 'loading'}
                className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl border border-sky-700 text-sky-800 hover:bg-sky-50 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {traceByIndex[i]?.status === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ruler className="w-4 h-4" />}
                {traceByIndex[i]?.status === 'loading' ? 'Trazando (unos segundos)...' : traceByIndex[i]?.status === 'done' ? 'Volver a trazar' : 'Trazado exacto'}
              </button>

              <TraceResult state={traceByIndex[i]} name={`diseno-${i + 1}`} />

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

      {history.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
            <History className="w-5 h-5 text-zinc-500" />
            Historial
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {history.map((design) => (
              <div
                key={design.id}
                className={`bg-white border rounded-2xl p-3 flex gap-3 ${currentDesignId === design.id ? 'border-primary' : 'border-zinc-200/60'}`}
              >
                <button
                  type="button"
                  onClick={() => openDesign(design)}
                  disabled={openingId !== null}
                  className="flex gap-3 flex-1 min-w-0 text-left cursor-pointer disabled:opacity-60"
                >
                  {/* Miniatura desde Storage (el optimizador de next/image está desactivado) */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={design.imageUrls[0]} alt="" className="w-20 h-24 rounded-lg object-cover bg-zinc-50 shrink-0" />
                  <span className="min-w-0 space-y-1">
                    <span className="block text-sm text-zinc-900 line-clamp-3">{design.description}</span>
                    <span className="block text-xs text-zinc-500">
                      {design.kind === 'expositor' ? 'Expositor' : 'Libre'} · {design.imageUrls.length} variante{design.imageUrls.length === 1 ? '' : 's'}
                      {Object.keys(design.fusionUrls).length > 0 && ` · ${Object.keys(design.fusionUrls).length} para Fusion`}
                    </span>
                    {design.orderId && (
                      <span className="block text-xs text-primary font-medium truncate">
                        {design.orderVariant != null ? `Variante ${design.orderVariant + 1} · ` : ''}Pedido: {orderLabel(design.orderId)}
                      </span>
                    )}
                    <span className="block text-xs text-zinc-400">
                      {openingId === design.id
                        ? 'Cargando...'
                        : new Date(design.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Mazatlan' })}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteDesign(design)}
                  aria-label="Borrar del historial"
                  className="self-start p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && images.length === 0 && !error && history.length === 0 && (
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
