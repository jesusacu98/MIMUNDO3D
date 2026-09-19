'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageOff, Plus, X } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';

interface CategoryOption {
  id: string;
  name: string;
}

interface SubcategoryOption {
  id: string;
  name: string;
  category_id: string;
}

interface ExtraImage {
  id: string;
  image_url: string;
}

interface ProductFormValues {
  name: string;
  category_id: string;
  description: string;
  subcategory_id: string | null;
  price: number;
  cost: number | null;
  is_starting_price: boolean;
  image_url: string;
  is_personalizable: boolean;
  has_business_info: boolean;
  has_character_option: boolean;
  is_active: boolean;
  is_trending: boolean;
  is_new: boolean;
  is_promo: boolean;
  display_order: number;
  extraImages?: ExtraImage[];
}

interface ProductFormProps {
  categories: CategoryOption[];
  subcategories?: SubcategoryOption[];
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: ProductFormValues;
  error?: string;
  submitLabel: string;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';
const checkboxRowClass = 'flex items-center gap-2 text-sm text-zinc-700';

export default function ProductForm({ categories, subcategories = [], action, initialValues, error, submitLabel }: ProductFormProps) {
  const [categoryId, setCategoryId] = useState(initialValues?.category_id ?? '');
  const [subcategoryId, setSubcategoryId] = useState(initialValues?.subcategory_id ?? '');
  const categorySubcategories = subcategories.filter((s) => s.category_id === categoryId);
  const [imageMode, setImageMode] = useState<'upload' | 'path'>(initialValues?.image_url ? 'path' : 'upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pathValue, setPathValue] = useState(initialValues?.image_url ?? '');
  const [previewError, setPreviewError] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const [removedExtraIds, setRemovedExtraIds] = useState<string[]>([]);
  const [newExtraFiles, setNewExtraFiles] = useState<File[]>([]);
  const extraFilesInputRef = useRef<HTMLInputElement>(null);
  const visibleExtraImages = (initialValues?.extraImages ?? []).filter((img) => !removedExtraIds.includes(img.id));
  const newExtraPreviews = useMemo(() => newExtraFiles.map((file) => ({ file, url: URL.createObjectURL(file) })), [newExtraFiles]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  useEffect(() => {
    return () => {
      newExtraPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [newExtraPreviews]);

  useEffect(() => {
    if (!extraFilesInputRef.current) return;
    const dataTransfer = new DataTransfer();
    newExtraFiles.forEach((file) => dataTransfer.items.add(file));
    extraFilesInputRef.current.files = dataTransfer.files;
  }, [newExtraFiles]);

  const handleExtraFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length > 0) setNewExtraFiles((prev) => [...prev, ...selected]);
  };

  const removeNewExtraFile = (index: number) => {
    setNewExtraFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!showImageModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowImageModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showImageModal]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFileName(file?.name ?? null);
    setFilePreviewUrl(file ? URL.createObjectURL(file) : null);
    setPreviewError(false);
  };

  const previewSrc = imageMode === 'upload' ? filePreviewUrl ?? initialValues?.image_url : pathValue;

  return (
    <>
    <form action={action} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 max-w-2xl space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      <div>
        <label htmlFor="name" className={labelClass}>
          Nombre <span className="text-primary">*</span>
        </label>
        <input id="name" name="name" type="text" required defaultValue={initialValues?.name} className={inputClass} />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="category_id" className={labelClass}>
            Categoría <span className="text-primary">*</span>
          </label>
          <a
            href="/admin/categorias/nueva"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-primary hover:text-primary-dark whitespace-nowrap"
          >
            + Nueva categoría
          </a>
        </div>
        <select
          id="category_id"
          name="category_id"
          required
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubcategoryId('');
          }}
          className={inputClass}
        >
          <option value="" disabled>
            Selecciona una categoría
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="subcategory_id" className={labelClass}>
            Subcategoría
          </label>
          <a
            href="/admin/subcategorias/nueva"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-primary hover:text-primary-dark whitespace-nowrap"
          >
            + Nueva subcategoría
          </a>
        </div>
        <select
          id="subcategory_id"
          name="subcategory_id"
          value={subcategoryId}
          onChange={(e) => setSubcategoryId(e.target.value)}
          disabled={!categoryId || categorySubcategories.length === 0}
          className={inputClass}
        >
          <option value="">
            {!categoryId ? 'Primero elige una categoría' : categorySubcategories.length === 0 ? 'Esta categoría no tiene subcategorías' : 'Sin subcategoría'}
          </option>
          {categorySubcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500 mt-1.5">Opcional. Aparece como filtro dentro de la categoría en el sitio.</p>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Descripción <span className="text-primary">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={initialValues?.description}
          className={inputClass}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={labelClass}>
            Imagen <span className="text-primary">*</span>
          </span>
          <div className="flex items-center gap-1 bg-zinc-100 rounded-full p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setImageMode('upload')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                imageMode === 'upload' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
              }`}
            >
              Subir imagen
            </button>
            <button
              type="button"
              onClick={() => setImageMode('path')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                imageMode === 'path' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
              }`}
            >
              Usar ruta existente
            </button>
          </div>
        </div>

        <div className="flex gap-4 mt-2 items-start">
          <button
            type="button"
            onClick={() => previewSrc && !previewError && setShowImageModal(true)}
            disabled={!previewSrc || previewError}
            className={`relative shrink-0 w-20 h-20 rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden flex items-center justify-center ${
              previewSrc && !previewError ? 'cursor-pointer hover:border-primary/40' : 'cursor-default'
            }`}
          >
            {previewSrc && !previewError ? (
              // Vista previa de una URL/archivo arbitrario que el admin está escribiendo o
              // recién seleccionó (incluye blob: locales) — next/image validaría el dominio
              // y rompería la vista previa a medio escribir, por eso es un <img> plano aquí.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={previewSrc}
                src={previewSrc}
                alt="Vista previa"
                className="w-full h-full object-cover"
                onError={() => setPreviewError(true)}
              />
            ) : (
              <ImageOff className="w-5 h-5 text-zinc-300" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            {imageMode === 'upload' ? (
              <>
                <input
                  key="image_file"
                  id="image_file"
                  name="image_file"
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFileChange}
                  className="w-full text-sm text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer cursor-pointer"
                />
                <p className="text-xs text-zinc-500 mt-1.5">
                  {fileName
                    ? `Se subirá como "${fileName}" — la ruta se asigna automáticamente, no hace falta escribirla.`
                    : 'Máx. 10MB. La ruta de la imagen se asigna sola a partir del nombre del archivo que subas.'}
                </p>
              </>
            ) : (
              <>
                <input
                  key="image_url"
                  id="image_url"
                  name="image_url"
                  type="text"
                  required
                  placeholder="/catalogo/21.jpg"
                  value={pathValue}
                  onChange={(e) => {
                    setPathValue(e.target.value);
                    setPreviewError(false);
                  }}
                  className={inputClass}
                />
                <p className="text-xs text-zinc-500 mt-1.5">
                  Ruta ya existente: un archivo que ya subiste al repo (<code>public/catalogo/…</code>) o una URL de Supabase Storage.
                </p>
              </>
            )}
          </div>
        </div>

        {initialValues?.image_url && <input type="hidden" name="current_image_url" value={initialValues.image_url} />}
      </div>

      <div>
        <span className={labelClass}>Imágenes adicionales</span>
        <p className="text-xs text-zinc-500 mt-1.5 mb-3">
          Se muestran junto a la portada en un carrusel dentro del catálogo público. Puedes seleccionar varias a la vez.
        </p>

        {(visibleExtraImages.length > 0 || newExtraPreviews.length > 0) && (
          <div className="flex flex-wrap gap-3 mb-3">
            {visibleExtraImages.map((img) => (
              <div key={img.id} className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setRemovedExtraIds((prev) => [...prev, img.id])}
                  aria-label="Quitar imagen"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {newExtraPreviews.map((p, i) => (
              <div key={p.url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewExtraFile(i)}
                  aria-label="Quitar imagen"
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {removedExtraIds.map((id) => (
          <input key={id} type="hidden" name="remove_image_ids" value={id} />
        ))}

        <label
          htmlFor="extra_image_files"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-zinc-300 text-xs font-bold text-zinc-600 hover:border-primary hover:text-primary cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar imágenes
        </label>
        <input
          ref={extraFilesInputRef}
          id="extra_image_files"
          name="extra_image_files"
          type="file"
          accept="image/*"
          multiple
          onChange={handleExtraFilesChange}
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="price" className={labelClass}>
            Precio (MXN) <span className="text-primary">*</span>
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initialValues?.price}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="display_order" className={labelClass}>
            Orden
          </label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            step="1"
            defaultValue={initialValues?.display_order ?? 0}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="cost" className={labelClass}>
          Costo de fabricación (MXN)
        </label>
        <input
          id="cost"
          name="cost"
          type="number"
          step="0.01"
          min="0"
          placeholder="Sin definir"
          defaultValue={initialValues?.cost ?? undefined}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 mt-1.5">
          Sólo visible aquí en el admin — no se muestra en el catálogo público. Se usa para calcular el costo automático de los pedidos.
        </p>
      </div>

      <div className="space-y-3 pt-2 border-t border-zinc-100">
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            name="is_starting_price"
            defaultChecked={initialValues?.is_starting_price ?? true}
            className="w-4 h-4 accent-primary"
          />
          Precio &quot;Desde&quot; (si no, se muestra como precio fijo)
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            name="is_personalizable"
            defaultChecked={initialValues?.is_personalizable ?? false}
            className="w-4 h-4 accent-primary"
          />
          Personalizable (pide nombre al cliente)
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            name="has_character_option"
            defaultChecked={initialValues?.has_character_option ?? false}
            className="w-4 h-4 accent-primary"
          />
          Permite elegir personaje (opcional)
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            name="has_business_info"
            defaultChecked={initialValues?.has_business_info ?? false}
            className="w-4 h-4 accent-primary"
          />
          Pide datos de negocio (nombre + eslogan)
        </label>
        <label className={checkboxRowClass}>
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={initialValues?.is_active ?? true}
            className="w-4 h-4 accent-primary"
          />
          Visible en el catálogo público
        </label>
      </div>

      <div className="space-y-3 pt-2 border-t border-zinc-100">
        <span className={labelClass}>Destacar en el inicio</span>
        <label className={checkboxRowClass}>
          <input type="checkbox" name="is_trending" defaultChecked={initialValues?.is_trending ?? false} className="w-4 h-4 accent-primary" />
          Tendencia
        </label>
        <label className={checkboxRowClass}>
          <input type="checkbox" name="is_new" defaultChecked={initialValues?.is_new ?? false} className="w-4 h-4 accent-primary" />
          Novedad / nuevo producto
        </label>
        <label className={checkboxRowClass}>
          <input type="checkbox" name="is_promo" defaultChecked={initialValues?.is_promo ?? false} className="w-4 h-4 accent-primary" />
          Promoción / descuento
        </label>
        <p className="text-xs text-zinc-500">Aparece en el carrusel correspondiente de la página de inicio (sólo si además está visible en el catálogo).</p>
      </div>

      <SubmitButton className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer">
        {submitLabel}
      </SubmitButton>
    </form>

    {showImageModal && previewSrc && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={() => setShowImageModal(false)}
      >
        <div className="relative max-w-3xl max-h-[85vh] w-full" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setShowImageModal(false)}
            className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white hover:bg-zinc-100 text-zinc-700 shadow-md flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Vista previa en grande"
            className="w-full h-full max-h-[85vh] object-contain rounded-2xl bg-white"
          />
        </div>
      </div>
    )}
    </>
  );
}
