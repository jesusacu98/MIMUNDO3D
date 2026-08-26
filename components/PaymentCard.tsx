'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CreditCard, Copy, Check } from 'lucide-react';
import { event } from '@/lib/gtag';

interface BankAccount {
  bank_name: string;
  interbank_clabe: string | null;
  account_holder_name: string;
  card_number: string | null;
}

interface PaymentCardProps {
  clientName: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  whatsappNumber?: string | null;
  bankAccount: BankAccount;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.464 3.484 1.343 4.997L2.02 22l5.116-1.343a9.955 9.955 0 0 0 4.868 1.257h.001c5.514 0 9.997-4.483 9.997-9.997 0-2.669-1.038-5.176-2.926-7.064a9.94 9.94 0 0 0-7.072-2.933zm5.848 15.845a8.302 8.302 0 0 1-4.851 1.548h-.001a8.29 8.29 0 0 1-4.229-1.156l-.304-.18-3.038.797.811-2.961-.198-.304a8.264 8.264 0 0 1-1.267-4.395c0-4.577 3.727-8.302 8.306-8.302a8.26 8.26 0 0 1 5.873 2.433 8.246 8.246 0 0 1 2.43 5.873c0 4.578-3.726 8.303-8.303 8.303z" />
    </svg>
  );
}

export default function PaymentCard({ clientName, logoUrl, brandColor, whatsappNumber, bankAccount }: PaymentCardProps) {
  const [copied, setCopied] = useState(false);

  const copyValue = bankAccount.interbank_clabe || bankAccount.card_number;

  // Números guardados como 10 dígitos locales (MX) necesitan el 52 al frente
  // para wa.me; si ya vienen con más dígitos (con lada), se usan tal cual.
  const whatsappDigits = whatsappNumber?.replace(/\D/g, '') ?? '';
  const whatsappUrl = whatsappDigits ? `https://wa.me/${whatsappDigits.length === 10 ? '52' + whatsappDigits : whatsappDigits}` : null;

  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      event('copy_bank_details', {
        method: bankAccount.interbank_clabe ? 'clabe' : 'card_number',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar al portapapeles: ', err);
    }
  };

  return (
    <div className="relative w-full max-w-md bg-white text-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 transition-all duration-300 hover:shadow-2xl">
      {/* Accent Red Dot */}
      {/* <span className="absolute top-6 right-6 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-sm shadow-rose-500/50" /> */}

      {/* Header */}
      <div className="flex flex-col items-center text-center mb-4">
        {logoUrl ? (
          <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-3 mb-4">
            <Image
              src={logoUrl}
              alt={`Logo de ${clientName}`}
              width={640}
              height={200}
              sizes="380px"
              className="w-72 max-h-32 object-contain"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
            <CreditCard className="w-5 h-5" />
          </div>
        )}
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Datos de Transferencia
        </h2>
        <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
          Toca el botón de abajo para copiar {bankAccount.interbank_clabe ? "la CLABE" : "el número de cuenta"}. Luego abre tu app bancaria y realiza el pago.
        </p>
      </div>

      {/* Data Visualization Box */}
      <div className="bg-slate-50/75 rounded-2xl p-5 border border-slate-100 space-y-4 mb-6">
        <div>
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            Negocio / Beneficiario
          </span>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">
            {clientName}
          </p>
          {bankAccount.account_holder_name && bankAccount.account_holder_name !== clientName && (
            <p className="text-xs text-slate-500 mt-0.5">
              Titular: {bankAccount.account_holder_name}
            </p>
          )}
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            Banco
          </span>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">
            {bankAccount.bank_name}
          </p>
        </div>

        {bankAccount.card_number && (
          <div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              Cuenta
            </span>
            <p className="text-sm font-semibold text-slate-900 tracking-wider font-mono mt-0.5 select-all">
              {bankAccount.card_number}
            </p>
          </div>
        )}

        {bankAccount.interbank_clabe && (
          <div>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              CLABE Interbancaria
            </span>
            <p className="text-lg font-bold text-slate-900 tracking-wider font-mono mt-0.5 select-all">
              {bankAccount.interbank_clabe}
            </p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handleCopy}
        disabled={!copyValue}
        className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md ${
          !copyValue
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            : copied
            ? 'bg-emerald-600 text-white shadow-emerald-600/10 hover:bg-emerald-700 cursor-pointer'
            : brandColor
            ? 'text-white shadow-black/10 hover:brightness-90 cursor-pointer'
            : 'bg-blue-600 text-white shadow-blue-600/10 hover:bg-blue-700 cursor-pointer'
        }`}
        style={copyValue && !copied && brandColor ? { backgroundColor: brandColor } : undefined}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 animate-in fade-in zoom-in duration-200" />
            <span>¡Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>{bankAccount.interbank_clabe ? "Copiar número CLABE" : "Copiar número de cuenta"}</span>
          </>
        )}
      </button>

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => event('whatsapp_click', { source: 'pago_card' })}
          className="w-full mt-3 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 border border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>Escribir por WhatsApp</span>
        </a>
      )}

      {/* Decorative Brand */}
      <div className="flex items-center justify-center gap-1.5 mt-6 text-[10px] text-slate-400">
        <span>Desarrollado por</span>
        <Link
          href="/"
          className="font-extrabold text-[10px] text-pink-300 tracking-widest uppercase hover:text-pink-400 transition-colors"
        >
          MIMUNDO3D
        </Link>
      </div>
    </div>
  );
}
