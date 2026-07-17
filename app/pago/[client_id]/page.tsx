'use client';

import { use, useEffect, useState } from "react";
import PaymentCard from "@/components/PaymentCard";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ client_id: string }>;
}

interface BankAccount {
  bank_name: string;
  interbank_clabe: string | null;
  account_holder_name: string;
  card_number: string | null;
}

interface PaymentData {
  clientName: string;
  bankAccount: BankAccount;
}

export default function PagoPage({ params }: PageProps) {
  // Read dynamic route params from promise
  const { client_id } = use(params);

  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPaymentData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/pago/${client_id}`);

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Cliente o cuenta no encontrados.");
        }

        const jsonData = await response.json();
        setData(jsonData);
      } catch (err: any) {
        setError(err.message || "Error al conectar con el servidor.");
      } finally {
        setLoading(false);
      }
    }

    if (client_id) {
      fetchPaymentData();
    }
  }, [client_id]);

  // Loading State
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Cargando datos de transferencia...
          </span>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4 dark:bg-rose-950/30 dark:text-rose-450">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Cliente o cuenta no encontrados
          </h2>
          <p className="text-sm text-slate-500 mt-2 dark:text-slate-400 max-w-xs leading-relaxed">
            {error || "El enlace de pago no es válido o la cuenta asociada no está configurada actualmente."}
          </p>
        </div>
      </div>
    );
  }

  // Success State
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
      <PaymentCard clientName={data.clientName} bankAccount={data.bankAccount} />
    </div>
  );
}
