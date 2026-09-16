export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  isStartingPrice: boolean;
  image: string;
  images: string[];
  personalizable: boolean;
  businessInfo: boolean;
  characterOption: boolean;
}

export interface ColorOption {
  name: string;
  hex: string;
}

export function formatPrice(product: Product) {
  const amount = product.price.toLocaleString('es-MX', {
    minimumFractionDigits: product.price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${product.isStartingPrice ? 'Desde ' : ''}$${amount} MXN`;
}
