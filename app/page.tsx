import Link from "next/link";
import Image from "next/image";
import { Palette, PartyPopper, Target, Lightbulb, ArrowRight, ImageIcon, Sparkles } from "lucide-react";
import CatalogFooter from "@/app/catalogo/CatalogFooter";
import SiteHeader from "@/components/SiteHeader";
import IdeasFab from "@/components/IdeasFab";
import { getSiteCategories } from "@/lib/siteCategories";
import { getFeaturedProducts } from "@/lib/featuredProducts";
import ProductCarousel from "@/components/ProductCarousel";
import Reveal from "@/components/Reveal";
import CategoryCarousel from "@/components/CategoryCarousel";
import BannerSlider from "@/components/BannerSlider";
import { getBanners } from "@/lib/banners";
import { EXAMPLE_PROMPTS, FILI_TAGLINE, ideasHrefFor } from "@/lib/ideas/examples";
import { supabase } from "@/lib/supabaseClient";

// Los carruseles de destacados se actualizan sin nuevo deploy (como /catalogo).
export const revalidate = 60;

export default async function Home() {
  const [featured, banners, categoryBanners, { data: categoryRows }, siteCategories] = await Promise.all([
    getFeaturedProducts(),
    getBanners("home"),
    getBanners("home_category"),
    supabase.from("product_categories").select("id, name"),
    getSiteCategories(),
  ]);
  // Las que se eligieron en /admin/categorias ("Mostrar en el inicio"), en el orden de la tabla.
  const homeCategories = siteCategories.filter((c) => c.showOnHome);
  const categoryIdByName = new Map((categoryRows ?? []).map((c) => [c.name, c.id]));

  const trending = featured.trending;

  const carousels = [
    { key: "novedades", title: "Novedades y nuevos productos", subtitle: "Lo último que hemos creado.", badge: "Nuevo", variant: "new" as const, products: featured.news },
    { key: "promociones", title: "Promociones y descuentos", subtitle: "Aprovecha antes de que se acaben.", badge: "Promo", variant: "promo" as const, products: featured.promos },
  ].filter((c) => c.products.length > 0);

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-900 selection:bg-primary selection:text-white">
      <SiteHeader />
      <IdeasFab />

      {/* Banners administrables (/admin/banners), arriba de todo */}
      {banners.length > 0 && (
        <section className="pt-6 sm:pt-8 bg-zinc-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <BannerSlider banners={banners} />
          </div>
        </section>
      )}

      {/* Trending carousel (arriba de "Explora por categoría") */}
      {trending.length > 0 && (
        <section className="py-12 sm:py-16 bg-zinc-50">
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

          <Reveal delay={120}>
          <CategoryCarousel>
            {homeCategories.map((category) => {
              // Imagen elegida en /admin/categorias; si no hay, los banners subidos desde /admin/banners para
              // esta categoría (rotan solos si hay varios).
              const categoryId = categoryIdByName.get(category.dbName);
              const tileBanners = categoryBanners.filter((b) => categoryId && b.categoryIds.includes(categoryId));
              return (
                <Link key={category.slug} href={`/categorias/${category.slug}`} className="group flex flex-col items-center text-center">
                  <div className="relative w-full aspect-[2/1] overflow-hidden rounded-lg bg-zinc-100">
                    {category.homeImageUrl ? (
                      <Image
                        src={category.homeImageUrl}
                        alt={category.dbName}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 82vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : tileBanners.length > 0 ? (
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
              );
            })}
          </CategoryCarousel>
          </Reveal>
        </div>
      </section>

      {/* Ideas e inspiración: chat con IA (/ideas), debajo de "Explora por categoría" */}
      <section className="py-16 sm:py-20 bg-zinc-50 border-t border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary-dark text-white shadow-xl shadow-primary/20">
              <div className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full bg-white/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-primary-dark/60 blur-3xl" />

              <div className="relative grid gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-2 lg:items-center lg:gap-14">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-white/25">
                    <Sparkles className="w-3.5 h-3.5" />
                    Ideas e inspiración
                  </span>
                  <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    ¿Qué tienes en mente?
                  </h2>
                  <p className="mt-3 font-semibold text-white">{FILI_TAGLINE}</p>
                  <p className="mt-4 text-white/90 leading-relaxed max-w-xl">
                    Cuéntanos tu problema o lo que quieres lograr, como “quiero ordenar mi escritorio” o “quiero decorar mi sala”, y te damos ideas de artículos. Guarda las que te gusten y mándalas a cotizar por WhatsApp.
                  </p>
                  <Link
                    href="/ideas"
                    className="btn-shine group mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-dark shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    Dame ideas
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80 mb-4">Prueba escribir algo así</p>
                  <div className="flex flex-wrap gap-2.5">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <Link
                        key={prompt}
                        href={ideasHrefFor(prompt)}
                        className="rounded-full bg-white/15 px-4 py-2 text-sm text-white ring-1 ring-white/25 transition-all hover:bg-white hover:text-primary-dark hover:-translate-y-0.5"
                      >
                        {prompt}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
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

      {/* Hero Section */}
      <section className="relative overflow-hidden border-t border-zinc-200/80 pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32 bg-zinc-50">
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
          </div>
          </Reveal>
        </div>
      </section>

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
