'use client';

import { useEffect, useState } from 'react';
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
const fileClass =
  'w-full text-sm text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer cursor-pointer';

// Vista previa de un archivo recién elegido, o de la imagen ya guardada.
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const src = previewUrl ?? currentUrl ?? null;

  return (
    <div>
      <span className={labelClass}>
        {label} {required && <span className="text-primary">*</span>}
      </span>
      {src && (
        <div className={`mt-2 ${aspectClass} rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100`}>
          {/* Vista previa de un archivo local (blob:) o de Supabase Storage. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="Vista previa" className="w-full h-full object-cover" />
        </div>
      )}
      <input
        name={name}
        type="file"
        accept="image/*"
        required={required}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          setPreviewUrl(file ? URL.createObjectURL(file) : null);
        }}
        className={`${fileClass} mt-3`}
      />
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
