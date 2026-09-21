import Image from "next/image";
import Link from "next/link";
import { Palette, PartyPopper, Target, Lightbulb, ArrowRight, ImageIcon } from "lucide-react";
import CatalogFooter from "@/app/catalogo/CatalogFooter";
import AdminNavLink from "@/components/AdminNavLink";
import { HOME_CATEGORIES } from "@/lib/homeCategories";
import { getFeaturedProducts } from "@/lib/featuredProducts";
import ProductCarousel from "@/components/ProductCarousel";
import Reveal from "@/components/Reveal";
import BannerSlider from "@/components/BannerSlider";
import { getBanners } from "@/lib/banners";
import { supabase } from "@/lib/supabaseClient";

// Los carruseles de destacados se actualizan sin nuevo deploy (como /catalogo).
export const revalidate = 60;

export default async function Home() {
  const [featured, banners, categoryBanners, { data: categoryRows }] = await Promise.all([
    getFeaturedProducts(),
    getBanners("home"),
    getBanners("home_category"),
    supabase.from("product_categories").select("id, name"),
  ]);
  const categoryIdByName = new Map((categoryRows ?? []).map((c) => [c.name, c.id]));

  const trending = featured.trending;

  const carousels = [
    { key: "novedades", title: "Novedades y nuevos productos", subtitle: "Lo último que hemos creado.", badge: "Nuevo", variant: "new" as const, products: featured.news },
    { key: "promociones", title: "Promociones y descuentos", subtitle: "Aprovecha antes de que se acaben.", badge: "Promo", variant: "promo" as const, products: featured.promos },
  ].filter((c) => c.products.length > 0);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-900 selection:bg-primary selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-6 sm:h-8 w-auto shrink" priority />
          </div>
          <nav className="flex items-center gap-3 sm:gap-6 shrink-0">
            <Link href="/" className="text-sm font-medium text-primary transition-colors">
              Inicio
            </Link>
            <Link
              href="/catalogo"
              className="btn-shine inline-flex items-center justify-center px-3 sm:px-4 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white shadow-md shadow-primary/10 transition-all active:scale-95 cursor-pointer"
            >
              Catálogo
            </Link>
            <AdminNavLink className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors" />
          </nav>
        </div>
      </header>

      {/* Banners administrables (/admin/banners), arriba de todo */}
      {banners.length > 0 && (
        <section className="pt-6 sm:pt-8 bg-zinc-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <BannerSlider banners={banners} />
          </div>
        </section>
      )}

      {/* Trending carousel (antes del hero) */}
      {trending.length > 0 && (
        <section className="py-12 sm:py-16 bg-zinc-50 border-b border-zinc-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProductCarousel
              title="Tendencia"
              subtitle="Lo más pedido del momento."
              badge="Tendencia"
              variant="trending"
              products={trending}
              fromQuery="desde=inicio"
              autoScroll
            />
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32 bg-zinc-50">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary-dark uppercase tracking-wider">
              Impresión 3D
            </span>
          </div>
          </Reveal>
          <Reveal delay={100}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 max-w-4xl mx-auto leading-tight">
            Donde tus ideas toman{" "}
            <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              forma
            </span>
          </h1>
          </Reveal>
          <Reveal delay={200}>
          <p className="mt-6 text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Materializamos tus ideas: Eventos, Negocios, Hogar y Tecnología.
          </p>
          </Reveal>
          <Reveal delay={300}>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/catalogo"
              className="btn-shine group w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-medium shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Ver Catálogo de Productos
              <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="#servicios"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 transition-all cursor-pointer"
            >
              Saber Más
            </a>
          </div>
          </Reveal>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-white relative border-t border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              Explora por categoría
            </h2>
            <p className="mt-4 text-zinc-600">
              Encuentra el producto ideal según lo que necesitas.
            </p>
          </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {HOME_CATEGORIES.map((category, index) => {
              // Banners subidos desde /admin/banners para esta categoría (rotan solos si hay varios).
              const categoryId = categoryIdByName.get(category.dbName);
              const tileBanners = categoryBanners.filter((b) => categoryId && b.categoryIds.includes(categoryId));
              return (
                <Reveal key={category.slug} delay={index * 120}>
                <Link href={`/categorias/${category.slug}`} className="group flex flex-col items-center text-center">
                  <div className="relative w-full aspect-[2/1] overflow-hidden rounded-lg bg-zinc-100">
                    {tileBanners.length > 0 ? (
                      <div className="transition-transform duration-500 group-hover:scale-105">
                        <BannerSlider banners={tileBanners} variant="tile" aspectClass="aspect-[2/1]" roundedClass="rounded-none" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-300">
                        <ImageIcon className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950">{category.dbName}</h3>
                  <span className="mt-6 inline-flex items-center justify-center px-8 py-3 rounded-lg bg-zinc-950 group-hover:bg-primary text-white text-sm font-medium uppercase tracking-wide transition-colors">
                    Ver más
                  </span>
                </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured carousels (Tendencia / Novedades / Promociones) */}
      {carousels.map((carousel, index) => (
        <section key={carousel.key} className={`py-16 border-t border-zinc-200/80 ${index % 2 === 0 ? "bg-zinc-50" : "bg-white"}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ProductCarousel
              title={carousel.title}
              subtitle={carousel.subtitle}
              badge={carousel.badge}
              variant={carousel.variant}
              autoScroll
              products={carousel.products}
              fromQuery="desde=inicio"
            />
          </div>
        </section>
      ))}

      {/* Services Section */}
      <section id="servicios" className="py-20 bg-zinc-50 border-y border-zinc-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              ¿Por qué elegir MiMundo3D?
            </h2>
            <p className="mt-4 text-zinc-600">
              Pasión, dedicación y el mayor de los empeños en cada pieza que creamos para ti.
            </p>
          </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 */}
            <Reveal delay={0} className="h-full">
            <div className="h-full bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-all">
                <Palette className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Diseños 100% Personalizados</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Olvídate de los moldes genéricos. Tú eliges los colores, tamaños y estilos; nosotros lo fabricamos a tu medida.
              </p>
            </div>
            </Reveal>

            {/* Card 2 */}
            <Reveal delay={100} className="h-full">
            <div className="h-full bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-all">
                <PartyPopper className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Negocios y Eventos</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Fabricamos todo tipo de piezas para destacar tu negocio, y creamos cualquier accesorio o decoración personalizada que necesites para hacer inolvidables tus fiestas.
              </p>
            </div>
            </Reveal>

            {/* Card 3 */}
            <Reveal delay={200} className="h-full">
            <div className="h-full bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-all">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Calidad y Precisión</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Usamos tecnología 3D avanzada y materiales resistentes para garantizar acabados impecables y duraderos.
              </p>
            </div>
            </Reveal>

            {/* Card 4 */}
            <Reveal delay={300} className="h-full">
            <div className="h-full bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-all">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">De la idea a la realidad</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Tú pones la idea y nosotros nos encargamos del resto, desde el diseño digital hasta entregarlo en tus manos.
              </p>
            </div>
            </Reveal>
          </div>
        </div>
      </section>

      <CatalogFooter />
    </div>
  );
}
