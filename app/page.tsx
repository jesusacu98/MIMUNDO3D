import Link from "next/link";
import { Cpu, Layers, Printer, Paintbrush, ArrowRight, Mail, Phone, MapPin } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-900 selection:bg-indigo-500 selection:text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-650 flex items-center justify-center shadow-md shadow-indigo-500/10">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-zinc-900">
              MIMUNDO<span className="text-indigo-600 font-extrabold">3D</span>
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-indigo-650 transition-colors">
              Inicio
            </Link>
            <Link href="/catalogo" className="text-sm font-medium text-zinc-650 hover:text-zinc-950 transition-colors">
              Catálogo
            </Link>
            <Link
              href="/catalogo"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-indigo-600 to-purple-650 hover:from-indigo-700 hover:to-purple-750 text-white shadow-md shadow-indigo-650/10 transition-all active:scale-95 cursor-pointer"
            >
              Explorar Catálogo
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32 bg-white">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
              Tecnología de Vanguardia 3D
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 max-w-4xl mx-auto leading-tight">
            Materializa tus ideas con precisión{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
              tridimensional
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Ofrecemos servicios de impresión 3D profesional, prototipado industrial de alta calidad y dispositivos inteligentes NFC personalizados para impulsar tu negocio.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/catalogo"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-650 hover:from-indigo-700 hover:to-purple-750 text-white font-medium shadow-lg shadow-indigo-650/25 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
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
              Nuestros Servicios Profesionales
            </h2>
            <p className="mt-4 text-zinc-600">
              Contamos con tecnología de punta y experiencia en diseño industrial para garantizar la máxima calidad en cada pieza.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Card 1 */}
            <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-5 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Impresión FDM</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Ideal para prototipos mecánicos, piezas funcionales y carcasas. Amplia gama de materiales como PLA, PETG, ABS y Nylon.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-5 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Impresión SLA</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Máxima resolución y acabado liso para miniaturas, joyería, modelos dentales y prototipos estéticos de alta fidelidad.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-pink-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 mb-5 group-hover:bg-pink-500 group-hover:text-white transition-all">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Productos NFC</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Diseño y fabricación 3D de expositores sociales y de pago inteligente con tecnología NFC integrada.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 group">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-5 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                <Paintbrush className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Modelado & Diseño</h3>
              <p className="text-sm text-zinc-650 leading-relaxed">
                Transformamos tus bocetos e ideas en modelos 3D listos para impresión, optimizados para fabricación digital.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-zinc-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-650 flex items-center justify-center shadow-md">
                <Printer className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-zinc-950">
                MIMUNDO<span className="text-indigo-600 font-extrabold">3D</span>
              </span>
            </div>
            <p className="text-sm text-zinc-600 max-w-xs">
              Llevando la fabricación digital al siguiente nivel con calidad, precisión y tecnología avanzada.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-4">Contacto</h4>
            <ul className="space-y-3 text-sm text-zinc-600">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>contacto@mimundo3d.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-600" />
                <span>+52 (55) 1234-5678</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>CDMX, México</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-4">Enlaces Rápidos</h4>
            <div className="flex flex-col space-y-2 text-sm text-zinc-600">
              <Link href="/" className="hover:text-indigo-650 transition-colors">Inicio</Link>
              <Link href="/catalogo" className="hover:text-indigo-650 transition-colors">Catálogo de Productos</Link>
              <a href="#" className="hover:text-indigo-650 transition-colors">Términos de Servicio</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-zinc-200 text-center text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} MIMUNDO3D. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
