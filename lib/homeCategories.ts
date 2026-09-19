export interface HomeCategory {
  slug: string;
  // Debe coincidir exactamente con product_categories.name en Supabase.
  dbName: string;
  description: string;
  // Título más llamativo para la página de la categoría (si falta, se usa dbName).
  headline?: string;
}

export const HOME_CATEGORIES: HomeCategory[] = [
  {
    slug: 'negocios',
    dbName: 'Negocios',
    headline: 'Todo para tu negocio, personalizado',
    description:
      'Diseñamos e imprimimos en 3D las piezas que hacen que tu negocio se vea profesional y se recuerde: todo con tu marca, tus colores y tus redes sociales.',
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
