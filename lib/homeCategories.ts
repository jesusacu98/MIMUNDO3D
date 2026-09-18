export interface HomeCategory {
  slug: string;
  // Debe coincidir exactamente con product_categories.name en Supabase.
  dbName: string;
  description: string;
}

export const HOME_CATEGORIES: HomeCategory[] = [
  {
    slug: 'negocios',
    dbName: 'Negocios',
    description: 'Señalética, tarjeteros y piezas de marca para destacar tu negocio.',
  },
  {
    slug: 'llaveros',
    dbName: 'Llaveros',
    description: 'Llaveros personalizados con tu nombre, logo o personaje favorito.',
  },
  {
    slug: 'hogar',
    dbName: 'Hogar',
    description: 'Piezas y organizadores para darle un toque único a tu espacio.',
  },
];
