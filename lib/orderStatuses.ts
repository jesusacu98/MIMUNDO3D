export const ORDER_STATUSES = ['Pendiente Cotizar', 'Pendiente Imprimir', 'Imprimiendo', 'Impreso', 'Entregado', 'Cancelado'];

export const PAYMENT_STATUSES = ['Pagado', 'Anticipo', 'Pendiente'];

export const orderStatusClass: Record<string, string> = {
  Entregado: 'bg-emerald-50 text-emerald-700',
  Imprimiendo: 'bg-blue-50 text-blue-700',
  Impreso: 'bg-violet-50 text-violet-700',
  'Pendiente Imprimir': 'bg-amber-50 text-amber-700',
  'Pendiente Cotizar': 'bg-zinc-100 text-zinc-500',
  Cancelado: 'bg-red-50 text-red-600',
};
