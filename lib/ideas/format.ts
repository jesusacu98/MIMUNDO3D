import type { IdeaProduct } from './types';

export function formatIdeaPrice(product: Pick<IdeaProduct, 'price' | 'isStartingPrice'>): string {
  const amount = product.price.toLocaleString('es-MX', {
    minimumFractionDigits: product.price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${product.isStartingPrice ? 'Desde ' : ''}$${amount} MXN`;
}
