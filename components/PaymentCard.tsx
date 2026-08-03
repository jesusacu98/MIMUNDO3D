'use client';

import { useState } from 'react';
import { CreditCard, Copy, Check } from 'lucide-react';

interface BankAccount {
  bank_name: string;
  interbank_clabe: string | null;
  account_holder_name: string;
  card_number: string | null;
}

interface PaymentCardProps {
  clientName: string;
  bankAccount: BankAccount;
}

export default function PaymentCard({ clientName, bankAccount }: PaymentCardProps) {
  const [copied, setCopied] = useState(false);

  const copyValue = bankAccount.interbank_clabe || bankAccount.card_number;

  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
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
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-inner">
          <CreditCard className="w-5 h-5" />
        </div>
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
            Beneficiario / Negocio
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

        <div>
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            Cuenta
          </span>
          <p className="text-sm font-semibold text-slate-900 tracking-wider font-mono mt-0.5 select-all">
            {bankAccount.card_number || "No registrada"}
          </p>
        </div>

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
            : 'bg-blue-600 text-white shadow-blue-600/10 hover:bg-blue-700 cursor-pointer'
        }`}
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

      {/* Decorative Brand */}
      <div className="flex items-center justify-center gap-1.5 mt-6 text-[10px] text-slate-400">
        <span>Desarrollado por</span>
        <span className="font-extrabold text-[10px] text-pink-300 tracking-widest uppercase">
          MIMUNDO3D
        </span>
      </div>
    </div>
  );
}
