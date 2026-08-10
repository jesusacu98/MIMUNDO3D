interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormValues {
  name: string;
  category_id: string;
  description: string;
  price: number;
  is_starting_price: boolean;
  image_url: string;
  is_personalizable: boolean;
  has_business_info: boolean;
  has_character_option: boolean;
  is_active: boolean;
  display_order: number;
}

interface ProductFormProps {
  categories: CategoryOption[];
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: ProductFormValues;
  error?: string;
  submitLabel: string;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';
const checkboxRowClass = 'flex items-center gap-2 text-sm text-zinc-700';

export default function ProductForm({ categories, action, initialValues, error, submitLabel }: ProductFormProps) {
  return (
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
          defaultValue={initialValues?.category_id ?? ''}
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
        <label htmlFor="image_url" className={labelClass}>
          Ruta de imagen <span className="text-primary">*</span>
        </label>
        <input
          id="image_url"
          name="image_url"
          type="text"
          required
          placeholder="/catalogo/21.jpg"
          defaultValue={initialValues?.image_url}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500 mt-1.5">
          La imagen debe subirse manualmente a <code>public/catalogo/</code> en el repo y hacer deploy antes (o después) de guardar aquí.
        </p>
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

      <button
        type="submit"
        className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer"
      >
        {submitLabel}
      </button>
    </form>
  );
}
