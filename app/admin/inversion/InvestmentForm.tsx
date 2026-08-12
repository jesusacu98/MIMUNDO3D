'use client';

import SubmitButton from '@/components/SubmitButton';

interface InvestmentFormValues {
  expense_date: string;
  description: string;
  cost: string;
  paid_by: string;
}

interface InvestmentFormProps {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: InvestmentFormValues;
  error?: string;
  submitLabel: string;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';

export default function InvestmentForm({ action, initialValues, error, submitLabel }: InvestmentFormProps) {
  return (
    <form action={action} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 max-w-md space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      <div>
        <label htmlFor="description" className={labelClass}>
          Concepto / Descripción <span className="text-primary">*</span>
        </label>
        <input
          id="description"
          name="description"
          type="text"
          required
          placeholder="Ej. Filamento 4 colores"
          defaultValue={initialValues?.description}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="cost" className={labelClass}>
            Costo (MXN) <span className="text-primary">*</span>
          </label>
          <input
            id="cost"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={initialValues?.cost}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="expense_date" className={labelClass}>
            Fecha
          </label>
          <input id="expense_date" name="expense_date" type="date" defaultValue={initialValues?.expense_date} className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="paid_by" className={labelClass}>
          Compró <span className="text-primary">*</span>
        </label>
        <input
          id="paid_by"
          name="paid_by"
          type="text"
          required
          list="paid_by_options"
          placeholder="Ej. Jesus"
          defaultValue={initialValues?.paid_by}
          className={inputClass}
        />
        <datalist id="paid_by_options">
          <option value="Jesus" />
          <option value="Adriana" />
        </datalist>
      </div>

      <SubmitButton className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
