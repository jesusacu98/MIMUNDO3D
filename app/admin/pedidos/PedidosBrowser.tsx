'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/lib/orderStatuses';
import PedidosTable, { type OrderRow } from './PedidosTable';

interface PedidosBrowserProps {
  orders: OrderRow[];
  emptyMessage: string;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  totalAllCount: number;
}

const inputClass =
  'px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';

// Navegar dentro de la misma ruta (cambiar searchParams: filtros o página)
// no dispara loading.tsx — eso sólo pasa en la primera navegación a una
// ruta. Por eso controlamos el estado pending nosotros con useTransition y
// mostramos un overlay directamente encima de la tabla.
export default function PedidosBrowser({ orders, emptyMessage, currentPage, totalPages, totalCount, totalAllCount }: PedidosBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const status = searchParams.get('status') ?? '';
  const payment = searchParams.get('payment') ?? '';
  const [query, setQuery] = useState(searchParams.get('q') ?? '');

  useEffect(() => {
    const current = searchParams.get('q') ?? '';
    if (query === current) return;
    const timeout = setTimeout(() => updateParams({ q: query }), 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function navigate(params: URLSearchParams) {
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  function updateParams(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page');
    navigate(params);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) params.set('page', String(page));
    else params.delete('page');
    navigate(params);
  }

  const hasActiveFilters = Boolean(query || status || payment);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          {isPending ? (
            <Loader2 className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          )}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente..."
            className={`${inputClass} w-full pl-9`}
          />
        </div>
        <select value={status} onChange={(e) => updateParams({ status: e.target.value })} className={inputClass}>
          <option value="">Todos los estatus</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select value={payment} onChange={(e) => updateParams({ payment: e.target.value })} className={inputClass}>
          <option value="">Todos los pagos</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              navigate(new URLSearchParams());
            }}
            className="text-sm font-bold text-primary hover:text-primary-dark cursor-pointer whitespace-nowrap"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <p className="text-xs text-zinc-500 mb-4">
          {totalCount} resultado(s) de {totalAllCount} pedido(s)
        </p>
      )}

      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px] rounded-2xl">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
        <PedidosTable orders={orders} emptyMessage={emptyMessage} />
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <p className="text-sm text-zinc-500">
            Página {currentPage} de {totalPages}
          </p>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
