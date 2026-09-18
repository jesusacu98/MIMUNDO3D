'use client';

import { useState } from 'react';
import { ImageOff, Nfc, Link2, Copy, Check, Download } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';
import { SOCIAL_NETWORKS } from '@/lib/socialNetworks';
import { buildQrSvg, downloadSvg } from '@/lib/qr';

interface ClientFormValues {
  name: string;
  logo_url: string | null;
  brand_color: string | null;
  bank_name: string;
  account_holder_name: string;
  card_number: string | null;
  interbank_clabe: string | null;
  whatsapp_number: string | null;
}

interface ClientFormProps {
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: ClientFormValues;
  // Sólo al editar: id del cliente (para mostrar los links cortos) y redes ya guardadas.
  clientId?: number;
  socialLinks?: Record<string, string>;
  initialTab?: 'nfc' | 'redes';
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

export default function ClientForm({ action, initialValues, clientId, socialLinks = {}, initialTab = 'nfc', error, submitLabel }: ClientFormProps) {
  const [tab, setTab] = useState<'nfc' | 'redes'>(initialTab);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
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

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${clientId}/${key}`);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles: ', err);
    }
  };

  const handleDownloadQr = (key: string) => {
    const svg = buildQrSvg(`${window.location.origin}/r/${clientId}/${key}`);
    downloadSvg(svg, `${initialValues?.name || 'cliente'}-${key}`);
  };

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
      active ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
    }`;

  return (
    <form action={action} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 max-w-2xl space-y-6">
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

      <div role="tablist" className="flex gap-2 border-t border-zinc-100 pt-6">
        <button type="button" role="tab" aria-selected={tab === 'nfc'} onClick={() => setTab('nfc')} className={tabClass(tab === 'nfc')}>
          <Nfc className="w-3.5 h-3.5" />
          NFC
        </button>
        <button type="button" role="tab" aria-selected={tab === 'redes'} onClick={() => setTab('redes')} className={tabClass(tab === 'redes')}>
          <Link2 className="w-3.5 h-3.5" />
          Redes
        </button>
      </div>

      {/* Los dos paneles viven en el mismo <form>: el oculto también se envía. */}
      <div hidden={tab !== 'nfc'} className="space-y-6">
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
        <p className="text-xs text-zinc-500">
          Datos que se muestran en la página de pago (<span className="font-mono">/pago/[id]</span>) cuando escanean su letrero NFC. Si este
          cliente no usa NFC, deja los datos bancarios vacíos.
        </p>

        <div>
          <label htmlFor="bank_name" className={labelClass}>
            Banco
          </label>
          {bankIsOther ? (
            <div className="flex gap-2 mt-2">
              <input
                id="bank_name"
                name="bank_name"
                type="text"
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
              <option value="">Selecciona un banco</option>
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
            Titular de la cuenta
          </label>
          <input
            id="account_holder_name"
            name="account_holder_name"
            type="text"
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

        <div>
          <label htmlFor="whatsapp_number" className={labelClass}>
            WhatsApp
          </label>
          <input
            id="whatsapp_number"
            name="whatsapp_number"
            type="text"
            inputMode="numeric"
            placeholder="10 dígitos, ej. 6691224168"
            defaultValue={initialValues?.whatsapp_number ?? ''}
            className={inputClass}
          />
          <p className="text-xs text-zinc-500 mt-1.5">Opcional. Si lo capturas, en la página de pago aparece un botón para escribirle por WhatsApp.</p>
        </div>
      </div>

      </div>

      <div hidden={tab !== 'redes'} className="space-y-6">
        <p className="text-xs text-zinc-500">
          Un link por red. Cada una queda con un link corto <span className="font-mono">/r/[cliente]/[red]</span> para compartir. Deja vacía una
          red para quitarla.
        </p>

        {SOCIAL_NETWORKS.map((network) => {
          const saved = Boolean(socialLinks[network.key]);
          return (
            <div key={network.key}>
              <label htmlFor={`url_${network.key}`} className={labelClass}>
                {network.label}
              </label>
              <input
                id={`url_${network.key}`}
                name={`url_${network.key}`}
                type="text"
                placeholder={network.placeholder}
                defaultValue={socialLinks[network.key] ?? ''}
                className={textInputClass}
              />
              {saved && clientId !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-xs text-zinc-600 break-all">
                    /r/{clientId}/{network.key}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(network.key)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark cursor-pointer shrink-0"
                  >
                    {copiedKey === network.key ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === network.key ? 'Copiado' : 'Copiar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadQr(network.key)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-dark cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar QR
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {clientId === undefined && <p className="text-xs text-zinc-500">El link corto de cada red aparece al guardar el cliente.</p>}
      </div>

      <SubmitButton className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
