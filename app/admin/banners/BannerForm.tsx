'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';
import { placementKey } from '@/lib/banners';

interface BannerFormValues {
  title: string;
  // Secciones donde se muestra, como claves "placement" o "placement:categoryId" (ver placementKey).
  placements: string[];
  link_url: string;
  display_order: number;
  is_active: boolean;
  image_url?: string;
  mobile_image_url?: string | null;
}

interface BannerFormProps {
  // Categorías que tienen página propia y casilla en "Explora por categoría".
  categories: { id: string; name: string }[];
  action: (formData: FormData) => void | Promise<void>;
  initialValues: BannerFormValues;
  error?: string;
  submitLabel: string;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';
// Zona para arrastrar y soltar una imagen (o hacer clic para elegirla), con vista previa del archivo
// nuevo o de la imagen ya guardada.
function ImagePicker({
  name,
  label,
  hint,
  currentUrl,
  required,
  aspectClass,
}: {
  name: string;
  label: string;
  hint: string;
  currentUrl?: string | null;
  required?: boolean;
  aspectClass: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const src = previewUrl ?? currentUrl ?? null;

  function showFile(file: File | null) {
    setDropError(null);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setFileName(file ? file.name : null);
  }

  // Un archivo soltado no pasa solo al <input>: se le asigna con DataTransfer para que el
  // formulario lo envíe igual que uno elegido con el selector.
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);

    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (!file) {
      setDropError('Suelta un archivo de imagen (JPG, PNG, WebP...).');
      return;
    }
    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }
    showFile(file);
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

  return (
    <div>
      <span className={labelClass}>
        {label} {required && <span className="text-primary">*</span>}
      </span>

      {/* sr-only (no hidden): un campo obligatorio oculto con display:none bloquea el envío sin mostrar el aviso. */}
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept="image/*"
        required={required}
        onChange={(e) => showFile(e.target.files?.[0] ?? null)}
        className="sr-only"
        tabIndex={-1}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label={`Elegir o arrastrar: ${label}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative mt-2 ${aspectClass} overflow-hidden rounded-xl border-2 cursor-pointer transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : src ? 'border-zinc-200 bg-zinc-100' : 'border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-400'
        }`}
      >
        {src && (
          // Vista previa de un archivo local (blob:) o de Supabase Storage.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Vista previa" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {(!src || dragActive) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            {dragActive ? <Upload className="h-7 w-7 text-primary" /> : <ImagePlus className="h-7 w-7 text-zinc-400" />}
            <p className="text-sm text-zinc-600">
              {dragActive ? (
                <span className="font-medium text-primary">Suelta la imagen aquí</span>
              ) : (
                <>
                  Arrastra una imagen aquí o <span className="font-medium text-primary">haz clic para elegirla</span>
                </>
              )}
            </p>
          </div>
        )}

        {src && !dragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/55 px-4 text-center text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Arrastra otra imagen o haz clic para cambiarla
          </div>
        )}
      </div>

      {fileName && <p className="mt-2 text-xs text-zinc-600">Nueva imagen: {fileName}</p>}
      {dropError && <p className="mt-2 text-xs text-red-600">{dropError}</p>}
      <p className="text-xs text-zinc-500 mt-1.5">{hint}</p>
    </div>
  );
}

const checkClass = 'flex items-center gap-2 text-sm text-zinc-700 cursor-pointer';

export default function BannerForm({ categories, action, initialValues, error, submitLabel }: BannerFormProps) {
  const isEditing = Boolean(initialValues.image_url);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialValues.placements));

  const allKeys = [
    'home',
    'catalog',
    ...categories.map((c) => placementKey('home_category', c.id)),
    ...categories.map((c) => placementKey('category_page', c.id)),
  ];
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const allSelected = allKeys.every((key) => selected.has(key));

  // Las imágenes de categoría del inicio son 2:1; el resto de secciones, 3:1.
  const hasTile = [...selected].some((key) => key.startsWith('home_category:'));
  const hasWide = [...selected].some((key) => !key.startsWith('home_category:'));
  const onlyTile = hasTile && !hasWide;
  const previewAspect = onlyTile ? 'aspect-[2/1]' : 'aspect-[3/1]';
  const sizeHint = onlyTile
    ? 'Recomendado: 1200 × 600 px (proporción 2:1)'
    : hasTile
      ? 'Recomendado: 1920 × 640 px (3:1). En las imágenes de categoría del inicio (2:1) se recortan los lados, así que deja lo importante al centro'
      : 'Recomendado: 1920 × 640 px (proporción 3:1)';

  const checkbox = (key: string, label: string) => (
    <label key={key} className={checkClass}>
      <input
        type="checkbox"
        name="placements"
        value={key}
        checked={selected.has(key)}
        onChange={() => toggle(key)}
        className="w-4 h-4 accent-primary"
      />
      {label}
    </label>
  );

  return (
    <form action={action} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 max-w-2xl space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      <div>
        <label htmlFor="title" className={labelClass}>
          Nombre <span className="text-primary">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          placeholder="Ej. Promo de Día de Muertos"
          defaultValue={initialValues.title}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 mt-1.5">Para identificarlo aquí; también es el texto alternativo de la imagen (accesibilidad).</p>
      </div>

      <fieldset>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <legend className={labelClass}>
            Dónde se muestra <span className="text-primary">*</span>
          </legend>
          <button
            type="button"
            onClick={() => setSelected(allSelected ? new Set() : new Set(allKeys))}
            className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer"
          >
            {allSelected ? 'Quitar todas' : 'Marcar todas'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-1.5">Elige todas las secciones que quieras: el mismo banner aparece en cada una.</p>

        <div className="mt-3 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {checkbox('home', 'Inicio · banner principal')}
            {checkbox('catalog', 'Catálogo (arriba de /catalogo)')}
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 mb-2">Inicio · imagen de la categoría (sección «Explora por categoría»)</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {categories.map((c) => checkbox(placementKey('home_category', c.id), c.name))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-500 mb-2">Página de la categoría (arriba de /categorias/…)</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {categories.map((c) => checkbox(placementKey('category_page', c.id), c.name))}
            </div>
          </div>
        </div>
        {hasTile && (
          <p className="text-xs text-zinc-500 mt-1.5">
            En «imagen de la categoría» varios banners de la misma categoría rotan solos, y al tocarlos siempre llevan a esa categoría (ahí no se usa el enlace).
          </p>
        )}
      </fieldset>

      <ImagePicker
        name="image_file"
        label="Imagen de escritorio"
        required={!isEditing}
        currentUrl={initialValues.image_url}
        aspectClass={previewAspect}
        hint={`${isEditing ? 'Sube otra sólo si quieres reemplazarla. ' : ''}${sizeHint}, máx. 10MB.`}
      />

      <div>
        <ImagePicker
          name="mobile_image_file"
          label="Imagen para celular (opcional)"
          currentUrl={initialValues.mobile_image_url}
          aspectClass="aspect-[16/9] max-w-xs"
          hint="Recomendado: 1280 × 720 px (proporción 16:9). Si no la subes, en celular se recorta la de escritorio."
        />
        {initialValues.mobile_image_url && (
          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input type="checkbox" name="remove_mobile_image" className="w-4 h-4 accent-primary" />
            Quitar la imagen de celular actual
          </label>
        )}
      </div>

      <div className={onlyTile ? 'hidden' : undefined}>
        <label htmlFor="link_url" className={labelClass}>
          Enlace (opcional)
        </label>
        <input
          id="link_url"
          name="link_url"
          type="text"
          placeholder="/catalogo  o  https://…"
          defaultValue={initialValues.link_url}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 mt-1.5">
          A dónde lleva al tocarlo. Ruta interna (ej. <code>/catalogo</code>, <code>/categorias/eventos</code>) o URL completa con https://. Vacío = no es clicable.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="display_order" className={labelClass}>
            Orden
          </label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            step="1"
            defaultValue={initialValues.display_order}
            className={inputClass}
          />
          <p className="text-xs text-zinc-500 mt-1.5">Menor número = aparece primero.</p>
        </div>
        <div className="flex items-end pb-6">
          <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
            <input type="checkbox" name="is_active" defaultChecked={initialValues.is_active} className="w-4 h-4 accent-primary" />
            Visible en el sitio
          </label>
        </div>
      </div>

      <SubmitButton className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
