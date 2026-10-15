// Días entre el pedido y que esté listo (pedido el jueves 15 → listo el miércoles 21).
const READY_AFTER_DAYS = 6;

// Fecha de entrega sugerida para un pedido: a los 6 días está listo y se entrega
// el primer sábado o domingo desde esa fecha (solo se entrega fin de semana).
// Recibe y devuelve fechas 'YYYY-MM-DD'; si la fecha no es válida devuelve ''.
export function suggestDeliveryDate(orderDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(orderDate);
  if (!match) return '';

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + READY_AFTER_DAYS));
  if (Number.isNaN(date.getTime())) return '';

  while (date.getUTCDay() !== 6 && date.getUTCDay() !== 0) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date.toISOString().slice(0, 10);
}
