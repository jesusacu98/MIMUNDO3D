'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, SlidersHorizontal, Printer, ArrowLeft, X, Mail, Phone, MapPin } from 'lucide-react';

const WHATSAPP_NUMBER = '526691224168';
const WHATSAPP_MESSAGE = encodeURIComponent(
  "¡Hola, MiMundo3D! 👋✨\n\n💡 Tengo una idea en mente que quiero materializar en 3D 🚀🤖.\n¿Les puedo compartir una foto 📸 o un modelo 🪐 para que me ayuden a cotizarlo? 🛠️\n\n¡Quedo atento! 📥"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

const AVAILABLE_COLORS = [
  { name: 'Rosa', hex: '#ff5371' },
  { name: 'Amarillo', hex: '#f2ca00' },
  { name: 'Azul', hex: '#003f85' },
  { name: 'Rojo', hex: '#bb0c17' },
  { name: 'Naranja', hex: '#ff8f4c' },
  { name: 'Verde', hex: '#219659' },
  { name: 'Dorado', hex: '#c9a227' },
  { name: 'Blanco', hex: '#ffffff' },
  { name: 'Negro', hex: '#18181b' },
  { name: 'Piel', hex: '#e8b796' },
  { name: 'Gris', hex: '#9ca3af' },
  { name: 'Verde Metálico', hex: '#4d7c5f' },
];

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.004 2.003c-5.514 0-9.997 4.483-9.997 9.997 0 1.762.464 3.484 1.343 4.997L2.02 22l5.116-1.343a9.955 9.955 0 0 0 4.868 1.257h.001c5.514 0 9.997-4.483 9.997-9.997 0-2.669-1.038-5.176-2.926-7.064a9.94 9.94 0 0 0-7.072-2.933zm5.848 15.845a8.302 8.302 0 0 1-4.851 1.548h-.001a8.29 8.29 0 0 1-4.229-1.156l-.304-.18-3.038.797.811-2.961-.198-.304a8.264 8.264 0 0 1-1.267-4.395c0-4.577 3.727-8.302 8.306-8.302a8.26 8.26 0 0 1 5.873 2.433 8.246 8.246 0 0 1 2.43 5.873c0 4.578-3.726 8.303-8.303 8.303z" />
    </svg>
  );
}

const CATEGORIES = [
  'Todos',
  'Llaveros',
  'Imanes',
  'Eventos',
  'Negocios y Marcas',
  'Escolares',
  'Decoración',
];

const PLACEHOLDER_PRODUCTS = [
  {
    id: 1,
    name: 'Nombre + Pompón',
    category: 'Llaveros',
    description: 'Llavero impreso en 3D con tu nombre grabado, pompón de peluche y dije colgante. Disponible en varios colores.',
    price: 'Desde $100 MXN',
    image: '/catalogo/1.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 2,
    name: 'Nombre + Mascota + Hobby',
    category: 'Llaveros',
    description: 'Combo de dijes 3D personalizados: tu nombre, tu mascota y tu hobby favorito, unidos en un solo llavero.',
    price: 'Desde $100 MXN',
    image: '/catalogo/2.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: true,
  },
  {
    id: 3,
    name: 'Nombre + Personaje',
    category: 'Llaveros',
    description: 'Llavero con la silueta de tu personaje, mascota o diseño favorito, personalizado con el nombre que quieras.',
    price: 'Desde $100 MXN',
    image: '/catalogo/3.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: true,
  },
  {
    id: 4,
    name: 'Graduación',
    category: 'Llaveros',
    description: 'El regalo perfecto para celebrar la graduación: nombre y año grabados en un birrete impreso en 3D.',
    price: 'Desde $25 MXN',
    image: '/catalogo/4.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 5,
    name: 'Imán de Graduación',
    category: 'Imanes',
    description: 'El regalo perfecto para celebrar la graduación: nombre y año grabados en un imán impreso en 3D para el refri.',
    price: 'Desde $25 MXN',
    image: '/catalogo/5.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 6,
    name: 'Letras 3D con Nombre + Personaje',
    category: 'Eventos',
    description: 'Nombre en 3D y tu personaje favorito. Perfectas para decorar un cuarto o como centro de mesa en fiestas.',
    price: 'Desde $200 MXN',
    image: '/catalogo/6.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: true,
  },
  {
    id: 7,
    name: 'Letras 3D con Nombre',
    category: 'Eventos',
    description: 'Nombre en 3D y tu personaje personalizado. Ideal para cumpleaños, baby shower o decoración de eventos.',
    price: 'Desde $200 MXN',
    image: '/catalogo/7.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: true,
  },
  {
    id: 8,
    name: 'Display Redes Sociales + QR + NFC',
    category: 'Negocios y Marcas',
    description: 'Expositor personalizado con tus redes sociales, código QR y chip NFC integrado, para que tus clientes te encuentren con solo acercar el celular.',
    price: 'Desde $350 MXN',
    image: '/catalogo/8.jpg',
    personalizable: false,
    businessInfo: true,
    characterOption: false,
  },
  {
    id: 9,
    name: 'Display Redes Sociales + QR + NFC',
    category: 'Negocios y Marcas',
    description: 'El mismo expositor, adaptado a los colores, logo y redes sociales de tu negocio.',
    price: 'Desde $350 MXN',
    image: '/catalogo/9.jpg',
    personalizable: false,
    businessInfo: true,
    characterOption: false,
  },
  {
    id: 10,
    name: 'Medalla de Alumno Sobresaliente',
    category: 'Escolares',
    description: 'Medalla dorada personalizada con el nombre del alumno y su grupo, ideal para reconocimientos y clausuras escolares.',
    price: 'Desde $40 MXN',
    image: '/catalogo/10.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 11,
    name: 'Cuadro de tu Jugador Favorito',
    category: 'Decoración',
    description: 'Cuadro decorativo con la playera de tu jugador favorito personalizada con tu nombre, enmarcada y lista para colgar.',
    price: 'Desde $350 MXN',
    image: '/catalogo/11.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: true,
  },
  {
    id: 12,
    name: 'Cuadro de tu Jugador Favorito',
    category: 'Decoración',
    description: 'El mismo cuadro, con la playera y el jugador que tú elijas, personalizado con tu nombre.',
    price: 'Desde $350 MXN',
    image: '/catalogo/12.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: true,
  },
  {
    id: 13,
    name: 'Lápiz Jumbo Pluma',
    category: 'Escolares',
    description: 'Pluma en forma de lápiz gigante, ideal para la escuela, oficina o de regalo. Elige tu color favorito.',
    price: 'Desde $35 MXN',
    image: '/catalogo/13.jpg',
    personalizable: false,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 14,
    name: 'Crayón Pluma Mediano',
    category: 'Escolares',
    description: 'Pluma en forma de crayón tamaño mediano, perfecta para la mochila o el estuche. Elige tu color favorito.',
    price: 'Desde $35 MXN',
    image: '/catalogo/14.jpg',
    personalizable: false,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 15,
    name: 'Crayón Pluma Jumbo',
    category: 'Escolares',
    description: 'Pluma en forma de crayón tamaño jumbo, súper llamativa. Elige tu color favorito.',
    price: 'Desde $40 MXN',
    image: '/catalogo/15.jpg',
    personalizable: false,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 16,
    name: 'Porta Lápiz con Nombre',
    category: 'Escolares',
    description: 'Adorno personalizado que se coloca en la punta del lápiz con el nombre que quieras, en el color que elijas.',
    price: 'Desde $10 MXN',
    image: '/catalogo/16.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 17,
    name: 'Porta Lápiz con Nombre',
    category: 'Escolares',
    description: 'Adorno personalizado que se coloca en la punta del lápiz con el nombre que quieras, en el color que elijas.',
    price: 'Desde $10 MXN',
    image: '/catalogo/17.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 18,
    name: 'Porta Lápiz con Nombre',
    category: 'Escolares',
    description: 'Adorno personalizado que se coloca en la punta del lápiz con el nombre que quieras, en el color que elijas.',
    price: 'Desde $10 MXN',
    image: '/catalogo/18.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 19,
    name: 'Kit de Regreso a Clases',
    category: 'Escolares',
    description: 'Incluye 5 lápices jumbo, 2 crayones pluma medianos y 1 crayón pluma jumbo, más 10 porta lápices personalizados con el nombre que quieras.',
    price: 'Desde $300 MXN',
    image: '/catalogo/19.jpg',
    personalizable: true,
    businessInfo: false,
    characterOption: false,
  },
  {
    id: 20,
    name: 'Tag para Mochila',
    category: 'Escolares',
    description: 'Tag personalizado para tu mochila con tu nombre completo y un personaje o ilustración a tu gusto, con anillo para colgar.',
    price: 'Desde $150 MXN',
    image: '/catalogo/20.png',
    personalizable: true,
    businessInfo: false,
    characterOption: true,
  }
];

function ProductThumbnail({
  src,
  alt,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
}: {
  src: string;
  alt: string;
  sizes?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
        <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(243,76,145,0.12),rgba(255,255,255,0))]" />
        <Printer className="w-12 h-12 text-zinc-300 mb-3 group-hover:text-primary transition-colors duration-300 z-10" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest z-10">
          Visualizar Pieza
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
      onError={() => setErrored(true)}
    />
  );
}

export default function Catalogo() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState<(typeof PLACEHOLDER_PRODUCTS)[number] | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [eslogan, setEslogan] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const filteredProducts = PLACEHOLDER_PRODUCTS.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                          product.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category));

  const openProduct = (product: (typeof PLACEHOLDER_PRODUCTS)[number]) => {
    setSelectedProduct(product);
    setSelectedColor(null);
    setCustomName('');
    setBusinessName('');
    setEslogan('');
    setCharacterName('');
    setAttemptedSubmit(false);
  };

  useEffect(() => {
    if (!selectedProduct) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedProduct(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedProduct]);

  return (
    <div className="flex flex-col min-h-screen min-w-0 bg-zinc-50 text-zinc-900 selection:bg-primary selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="mr-1 sm:mr-2 shrink-0 text-zinc-400 hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-6 sm:h-8 w-auto shrink" />
          </div>
          <nav className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors">
              Inicio
            </Link>
            <Link href="/catalogo" className="text-sm font-medium text-primary transition-colors">
              Catálogo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Header */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 min-w-0">
        <div className="text-left mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 mb-3">
            Nuestro Catálogo
          </h1>
          <p className="text-zinc-600 max-w-xl">
            Explora nuestra colección de productos impresos en 3D. Calidad y diseño a tu alcance.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar producto, material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto min-w-0 no-scrollbar py-1">
            <SlidersHorizontal className="w-4 h-4 text-zinc-400 shrink-0 hidden sm:inline" />
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white text-zinc-500 border border-zinc-200 hover:text-zinc-900 hover:border-zinc-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => openProduct(product)}
                className="bg-white border border-zinc-200/60 rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group flex flex-col h-full cursor-pointer"
              >
                <div className="aspect-square w-full bg-zinc-50 relative overflow-hidden">
                  <ProductThumbnail src={product.image} alt={product.name} />
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  <span className="text-xs text-primary font-semibold mb-1 uppercase tracking-wider">{product.category}</span>
                  <h3 className="text-md font-bold text-zinc-950 mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-4 flex-grow">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                    <span className="text-sm font-extrabold text-zinc-950">{product.price}</span>
                    <button
                      onClick={() => openProduct(product)}
                      className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 group/btn cursor-pointer"
                    >
                      Ver Detalles
                      <span className="transition-transform group-hover/btn:translate-x-0.5">→</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-dashed border-zinc-200 rounded-2xl">
            <p className="text-zinc-500 text-sm">No se encontraron productos que coincidan con la búsqueda.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4 bg-white w-fit px-3 py-1.5 rounded-lg">
              <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-6 w-auto" />
            </div>
            <p className="text-sm text-white/80 max-w-xs">
              Donde tus ideas toman forma.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-white" />
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=mimundo3d.studio@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  mimundo3d.studio@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-white" />
                <a href="tel:+526691224168" className="hover:text-white transition-colors">
                  +52 (669) 122-4168
                </a>
              </li>
              <li className="flex items-center gap-2">
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
              </li>
              <li className="flex items-center gap-2">
                <InstagramIcon className="w-4 h-4 text-white" />
                <a
                  href="https://www.instagram.com/mimundo3d.studio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Instagram
                </a>
              </li>
              <li className="flex items-center gap-2">
                <FacebookIcon className="w-4 h-4 text-white" />
                <a
                  href="https://www.facebook.com/people/MiMundo3D/61590489636586/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Facebook
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-white" />
                <span>Mazatlán, Sinaloa</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Enlaces Rápidos</h4>
            <div className="flex flex-col space-y-2 text-sm text-white/80">
              <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
              <Link href="/catalogo" className="hover:text-white transition-colors">Catálogo de Productos</Link>
              <a href="#" className="hover:text-white transition-colors">Términos de Servicio</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-white/20 text-center text-xs text-white">
          <p>© {new Date().getFullYear()} MIMUNDO3D. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <div className="aspect-square sm:aspect-video w-full bg-zinc-50 relative overflow-hidden">
                <ProductThumbnail
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  sizes="(max-width: 640px) 100vw, 672px"
                />
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-zinc-600 hover:text-zinc-950 shadow-md flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 sm:p-8">
              <span className="text-xs text-primary font-semibold mb-1 uppercase tracking-wider">
                {selectedProduct.category}
              </span>
              <h2 className="text-2xl font-bold text-zinc-950 mt-1 mb-3">{selectedProduct.name}</h2>
              <p className="text-sm text-zinc-600 leading-relaxed mb-6">{selectedProduct.description}</p>

              {selectedProduct.personalizable && (
                <div className="mb-6">
                  <label htmlFor="custom-name" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                    ¿Qué nombre quieres que lleve? <span className="text-primary">*</span>
                  </label>
                  <input
                    id="custom-name"
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Ej. Adriana"
                    className={`w-full mt-2 px-4 py-2.5 bg-zinc-50 border rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all ${
                      attemptedSubmit && !customName.trim() ? 'border-red-400' : 'border-zinc-200'
                    }`}
                  />
                  {attemptedSubmit && !customName.trim() && (
                    <p className="text-xs text-red-500 mt-1">Escribe el nombre que quieres que lleve.</p>
                  )}
                </div>
              )}

              {selectedProduct.characterOption && (
                <div className="mb-6">
                  <label htmlFor="character-name" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                    ¿Qué personaje quieres? (opcional)
                  </label>
                  <input
                    id="character-name"
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Ej. La rana René"
                    className="w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all"
                  />
                </div>
              )}

              {selectedProduct.businessInfo && (
                <>
                  <div className="mb-6">
                    <label htmlFor="business-name" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                      Nombre de tu negocio o marca <span className="text-primary">*</span>
                    </label>
                    <input
                      id="business-name"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Ej. El Malcriado Elotes"
                      className={`w-full mt-2 px-4 py-2.5 bg-zinc-50 border rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all ${
                        attemptedSubmit && !businessName.trim() ? 'border-red-400' : 'border-zinc-200'
                      }`}
                    />
                    {attemptedSubmit && !businessName.trim() && (
                      <p className="text-xs text-red-500 mt-1">Escribe el nombre de tu negocio o marca.</p>
                    )}
                  </div>

                  <div className="mb-6">
                    <label htmlFor="eslogan" className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                      Eslogan <span className="text-primary">*</span>
                    </label>
                    <input
                      id="eslogan"
                      type="text"
                      value={eslogan}
                      onChange={(e) => setEslogan(e.target.value)}
                      placeholder="Ej. El toque perfecto para tu antojo"
                      className={`w-full mt-2 px-4 py-2.5 bg-zinc-50 border rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all ${
                        attemptedSubmit && !eslogan.trim() ? 'border-red-400' : 'border-zinc-200'
                      }`}
                    />
                    {attemptedSubmit && !eslogan.trim() && (
                      <p className="text-xs text-red-500 mt-1">Escribe el eslogan de tu negocio.</p>
                    )}
                  </div>
                </>
              )}

              <div className="mb-6">
                <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                  Color {selectedColor ? `— ${selectedColor}` : ''} <span className="text-primary">*</span>
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVAILABLE_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name === selectedColor ? null : color.name)}
                      title={color.name}
                      aria-label={color.name}
                      className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                        selectedColor === color.name
                          ? 'border-primary ring-2 ring-primary ring-offset-2'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
                {attemptedSubmit && !selectedColor && (
                  <p className="text-xs text-red-500 mt-2">Selecciona un color.</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t border-zinc-100">
                <span className="text-2xl font-extrabold text-zinc-950">{selectedProduct.price}</span>
                <button
                  onClick={() => {
                    const missingName = selectedProduct.personalizable && !customName.trim();
                    const missingBusinessName = selectedProduct.businessInfo && !businessName.trim();
                    const missingEslogan = selectedProduct.businessInfo && !eslogan.trim();
                    const missingColor = !selectedColor;
                    if (missingName || missingBusinessName || missingEslogan || missingColor) {
                      setAttemptedSubmit(true);
                      return;
                    }
                    const message = `¡Hola, MiMundo3D! 👋 Me interesa este producto: ${selectedProduct.name} (${selectedProduct.category})${
                      customName.trim() ? `, nombre: ${customName.trim()}` : ''
                    }${characterName.trim() ? `, personaje: ${characterName.trim()}` : ''}${
                      businessName.trim() ? `, negocio/marca: ${businessName.trim()}` : ''
                    }${eslogan.trim() ? `, eslogan: ${eslogan.trim()}` : ''}, color: ${selectedColor}. ¿Me pueden dar más información?`;
                    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  Pedir por WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
