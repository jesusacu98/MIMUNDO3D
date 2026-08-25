'use client';

import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';

interface ClientFormValues {
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  bank_name: string;
  account_holder_name: string;
  card_number: string | null;
  interbank_clabe: string | null;
}

interface ClientFormProps {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: ClientFormValues;
  error?: string;
  submitLabel: string;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all font-mono';
const textInputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const KNOWN_BANKS = [
  'BBVA',
  'Banorte',
  'Santander',
  'Citibanamex',
  'HSBC',
  'Scotiabank',
  'Inbursa',
  'Banco Azteca',
  'Banco del Bienestar',
  'Banregio',
  'Afirme',
  'Multiva',
  'Mifel',
  'Invex',
  'Actinver',
  'Ve por Más',
  'STP',
  'Nu México',
  'Klar',
];
const OTHER_BANK = '__otro__';

export default function ClientForm({ action, initialValues, error, submitLabel }: ClientFormProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(initialValues?.logo_url ?? null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [brandColor, setBrandColor] = useState(initialValues?.brand_color ?? '');
  const initialBankName = initialValues?.bank_name ?? '';
  const [bankIsOther, setBankIsOther] = useState(Boolean(initialBankName) && !KNOWN_BANKS.includes(initialBankName));
  const [bankName, setBankName] = useState(initialBankName);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setRemoveLogo(false);
    setLogoPreview(file ? URL.createObjectURL(file) : (initialValues?.logo_url ?? null));
  };

  return (
    <form action={action} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 max-w-lg space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

      <div>
        <label htmlFor="name" className={labelClass}>
          Nombre del cliente / negocio <span className="text-primary">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Ej. Elotes El Malcriado"
          defaultValue={initialValues?.name}
          className={textInputClass}
        />
      </div>

      <div>
        <label htmlFor="logo_file" className={labelClass}>
          Logo del negocio
        </label>
        <div className="flex gap-4 mt-2 items-start">
          <div className="relative shrink-0 w-16 h-16 rounded-xl bg-zinc-50 border border-zinc-200 overflow-hidden flex items-center justify-center">
            {logoPreview && !removeLogo ? (
              // Vista previa local (blob: del archivo recién elegido, o URL ya guardada) —
              // next/image no acepta blob: a medio elegir, por eso es un <img> plano aquí.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={logoPreview} src={logoPreview} alt="Vista previa del logo" className="w-full h-full object-contain" />
            ) : (
              <ImageOff className="w-5 h-5 text-zinc-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <input
              id="logo_file"
              name="logo_file"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="w-full text-sm text-zinc-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer cursor-pointer"
            />
            <p className="text-xs text-zinc-500 mt-1.5">Opcional. Máx. 10MB. Se muestra en la página de pago del letrero NFC.</p>
            {initialValues?.logo_url && (
              <label className="flex items-center gap-2 text-xs text-zinc-600 mt-2">
                <input
                  type="checkbox"
                  name="remove_logo"
                  checked={removeLogo}
                  onChange={(e) => {
                    setRemoveLogo(e.target.checked);
                    setLogoPreview(e.target.checked ? null : (initialValues?.logo_url ?? null));
                  }}
                  className="w-4 h-4 accent-primary"
                />
                Quitar logo actual
              </label>
            )}
          </div>
        </div>
        {initialValues?.logo_url && <input type="hidden" name="current_logo_url" value={initialValues.logo_url} />}
      </div>

      <div>
        <label htmlFor="brand_color" className={labelClass}>
          Color de marca
        </label>
        <div className="flex items-center gap-3 mt-2">
          <input
            type="color"
            aria-label="Selector de color de marca"
            value={HEX_COLOR_RE.test(brandColor) ? brandColor : '#2563EB'}
            onChange={(e) => setBrandColor(e.target.value.toUpperCase())}
            className="w-11 h-11 shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 cursor-pointer"
          />
          <input
            id="brand_color"
            name="brand_color"
            type="text"
            placeholder="#2563EB"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all font-mono uppercase"
          />
        </div>
        <p className="text-xs text-zinc-500 mt-1.5">Opcional. Se usa como acento de color en la página de pago.</p>
      </div>

      <div className="border-t border-zinc-100 pt-6 space-y-6">
        <p className="text-xs text-zinc-500">Datos que se muestran en la página de pago (<span className="font-mono">/pago/[id]</span>) cuando escanean su letrero NFC.</p>

        <div>
          <label htmlFor="bank_name" className={labelClass}>
            Banco <span className="text-primary">*</span>
          </label>
          {bankIsOther ? (
            <div className="flex gap-2 mt-2">
              <input
                id="bank_name"
                name="bank_name"
                type="text"
                required
                placeholder="Nombre del banco"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => {
                  setBankIsOther(false);
                  setBankName('');
                }}
                className="text-xs font-bold text-zinc-500 hover:text-primary shrink-0 self-center whitespace-nowrap"
              >
                Elegir de la lista
              </button>
            </div>
          ) : (
            <select
              id="bank_name"
              name="bank_name"
              required
              value={KNOWN_BANKS.includes(bankName) ? bankName : ''}
              onChange={(e) => {
                if (e.target.value === OTHER_BANK) {
                  setBankIsOther(true);
                  setBankName('');
                } else {
                  setBankName(e.target.value);
                }
              }}
              className={textInputClass}
            >
              <option value="" disabled>
                Selecciona un banco
              </option>
              {KNOWN_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
              <option value={OTHER_BANK}>Otro…</option>
            </select>
          )}
        </div>

        <div>
          <label htmlFor="account_holder_name" className={labelClass}>
            Titular de la cuenta <span className="text-primary">*</span>
          </label>
          <input
            id="account_holder_name"
            name="account_holder_name"
            type="text"
            required
            placeholder="Nombre completo del titular"
            defaultValue={initialValues?.account_holder_name}
            className={textInputClass}
          />
        </div>

        <div>
          <label htmlFor="interbank_clabe" className={labelClass}>
            CLABE interbancaria
          </label>
          <input
            id="interbank_clabe"
            name="interbank_clabe"
            type="text"
            inputMode="numeric"
            placeholder="18 dígitos"
            defaultValue={initialValues?.interbank_clabe ?? ''}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="card_number" className={labelClass}>
            Número de cuenta / tarjeta
          </label>
          <input
            id="card_number"
            name="card_number"
            type="text"
            inputMode="numeric"
            placeholder="10 a 19 dígitos"
            defaultValue={initialValues?.card_number ?? ''}
            className={inputClass}
          />
          <p className="text-xs text-zinc-500 mt-1.5">Captura al menos la CLABE o el número de cuenta/tarjeta.</p>
        </div>
      </div>

      <SubmitButton className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
