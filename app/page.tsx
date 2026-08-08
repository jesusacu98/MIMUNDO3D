import Image from "next/image";
import Link from "next/link";
import { Palette, PartyPopper, Target, Lightbulb, ArrowRight, Mail, Phone, MapPin } from "lucide-react";

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

const WHATSAPP_NUMBER = "526691224168";
const WHATSAPP_MESSAGE = encodeURIComponent(
  "¡Hola, MiMundo3D! 👋✨\n\n💡 Tengo una idea en mente que quiero materializar en 3D 🚀🤖.\n¿Les puedo compartir una foto 📸 o un modelo 🪐 para que me ayuden a cotizarlo? 🛠️\n\n¡Quedo atento! 📥"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

export default function Home() {
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
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white shadow-md shadow-primary/10 transition-all active:scale-95 cursor-pointer"
            >
              Catálogo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32 bg-white">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary-dark uppercase tracking-wider">
              Impresión 3D
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 max-w-4xl mx-auto leading-tight">
            Donde tus ideas toman{" "}
            <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
              forma
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Materializamos tus ideas: Eventos, Negocios, Hogar y Tecnología.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/catalogo"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-medium shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Ver Catálogo de Productos
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <a
              href="#servicios"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 transition-all cursor-pointer"
            >
              Saber Más
            </a>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-20 bg-zinc-50 border-y border-zinc-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
              ¿Por qué elegir MiMundo3D?
            </h2>
            <p className="mt-4 text-zinc-600">
              Pasión, dedicación y el mayor de los empeños en cada pieza que creamos para ti.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 */}
            <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-all">
                <Palette className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Diseños 100% Personalizados</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Olvídate de los moldes genéricos. Tú eliges los colores, tamaños y estilos; nosotros lo fabricamos a tu medida.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-all">
                <PartyPopper className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Negocios y Eventos</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Fabricamos todo tipo de piezas para destacar tu negocio, y creamos cualquier accesorio o decoración personalizada que necesites para hacer inolvidables tus fiestas.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-all">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Calidad y Precisión</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Usamos tecnología 3D avanzada y materiales resistentes para garantizar acabados impecables y duraderos.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary group-hover:text-white transition-all">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">De la idea a la realidad</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Tú pones la idea y nosotros nos encargamos del resto, desde el diseño digital hasta entregarlo en tus manos.
              </p>
            </div>
          </div>
        </div>
      </section>

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
    </div>
  );
}
