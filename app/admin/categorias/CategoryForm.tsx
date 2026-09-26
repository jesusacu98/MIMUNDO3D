import SubmitButton from '@/components/SubmitButton';
import CategoryImagePicker from './CategoryImagePicker';

interface CategoryFormValues {
  name: string;
  display_order: number;
  slug?: string | null;
  description?: string | null;
  headline?: string | null;
  show_on_home?: boolean;
  home_image_url?: string | null;
}

interface CategoryFormProps {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: CategoryFormValues;
  error?: string;
  submitLabel: string;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';

export default function CategoryForm({ action, initialValues, error, submitLabel }: CategoryFormProps) {
  return (
    <form action={action} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 max-w-xl space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      <div>
        <label htmlFor="name" className={labelClass}>
          Nombre <span className="text-primary">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Ej. Accesorios"
          defaultValue={initialValues?.name}
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
        <p className="text-xs text-zinc-500 mt-1.5">
          Controla en qué posición aparece la categoría en el catálogo y en el inicio (las de número menor van primero).
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="show_on_home"
            defaultChecked={initialValues?.show_on_home ?? false}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-primary"
          />
          <span>
            <span className="block text-sm font-semibold text-zinc-900">Mostrar en el inicio</span>
            <span className="block text-xs text-zinc-500 mt-0.5">Aparece en &quot;Explora por categoría&quot; del inicio.</span>
          </span>
        </label>
      </div>

      <CategoryImagePicker currentUrl={initialValues?.home_image_url} />

      <div>
        <label htmlFor="headline" className={labelClass}>
          Título llamativo (opcional)
        </label>
        <input
          id="headline"
          name="headline"
          type="text"
          placeholder="Ej. Todo para el regreso a clases"
          defaultValue={initialValues?.headline ?? ''}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 mt-1.5">Título de la página de la categoría. Si lo dejas vacío se usa el nombre.</p>
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Una o dos frases que van debajo del título en la página de la categoría."
          defaultValue={initialValues?.description ?? ''}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="slug" className={labelClass}>
          Enlace de la página
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          placeholder="Se genera solo a partir del nombre"
          defaultValue={initialValues?.slug ?? ''}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 mt-1.5">Va en la dirección: /categorias/<strong>enlace</strong>. Cambiarlo rompe los enlaces ya compartidos.</p>
      </div>

      <SubmitButton className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
