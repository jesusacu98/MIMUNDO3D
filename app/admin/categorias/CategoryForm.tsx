interface CategoryFormValues {
  name: string;
  display_order: number;
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
    <form action={action} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 max-w-md space-y-6">
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
        <p className="text-xs text-zinc-500 mt-1.5">Controla en qué posición aparece el filtro de categoría en el catálogo.</p>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer"
      >
        {submitLabel}
      </button>
    </form>
  );
}
