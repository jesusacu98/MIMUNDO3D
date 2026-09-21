import Image from 'next/image';
import Link from 'next/link';
import { ArrowUp, ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';
import Reveal from '@/components/Reveal';
import { HOME_CATEGORIES } from '@/lib/homeCategories';
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from './icons';

const WHATSAPP_NUMBER = '526691224168';
const WHATSAPP_MESSAGE = encodeURIComponent(
  "¡Hola, MiMundo3D! 👋✨\n\n💡 Tengo una idea en mente que quiero materializar en 3D 🚀🤖.\n¿Les puedo compartir una foto 📸 o un modelo 🪐 para que me ayuden a cotizarlo? 🛠️\n\n¡Quedo atento! 📥"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;
const EMAIL = 'mimundo3d.studio@gmail.com';

const socialClass =
  'w-11 h-11 rounded-full bg-white/15 hover:bg-white text-white hover:text-primary-dark ring-1 ring-white/25 flex items-center justify-center transition-all duration-300 hover:-translate-y-1 active:scale-95';
const linkClass =
  'group/link inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white transition-colors w-fit';
const headingClass = 'text-xs font-bold text-white uppercase tracking-[0.18em] mb-5';
const chipClass = 'w-9 h-9 shrink-0 rounded-xl bg-white/15 ring-1 ring-white/20 flex items-center justify-center';

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={linkClass}>
      <span className="w-0 h-px bg-white transition-all duration-300 group-hover/link:w-3" />
      {children}
    </Link>
  );
}

export default function CatalogFooter() {
  return (
    <footer className="mt-auto relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-dark text-white">
      {/* Brillos decorativos */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary-dark/60 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16">
        {/* Llamado a la acción */}
        <Reveal>
          <div className="rounded-3xl bg-white/10 backdrop-blur-sm ring-1 ring-white/25 p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">¿Tienes una idea en mente?</h2>
              <p className="mt-2 text-sm sm:text-base text-white/90 leading-relaxed">
                Cuéntanos qué quieres crear y te ayudamos a materializarlo en 3D. Cotizamos sin compromiso.
              </p>
            </div>
            <TrackedLink
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              eventName="generate_lead"
              eventParams={{ method: 'whatsapp', source: 'footer_cta' }}
              className="btn-shine group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-primary-dark font-bold text-sm shadow-lg shadow-black/10 hover:shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0 shrink-0 cursor-pointer"
            >
              <WhatsAppIcon className="w-5 h-5" />
              Cotizar por WhatsApp
              <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </TrackedLink>
          </div>
        </Reveal>

        {/* Columnas */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.3fr] gap-10 lg:gap-14">
          <div>
            <div className="bg-white w-fit px-3.5 py-2 rounded-xl shadow-md shadow-black/10">
              <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-7 w-auto" />
            </div>
            <p className="mt-5 text-sm text-white/90 max-w-xs leading-relaxed">
              Donde tus ideas toman forma. Diseñamos e imprimimos en 3D piezas personalizadas para tu negocio, tu evento y tu hogar.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <TrackedLink
                href="https://www.instagram.com/mimundo3d.studio/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={socialClass}
                eventName="select_content"
                eventParams={{ content_type: 'social_link', item_id: 'instagram' }}
              >
                <InstagramIcon className="w-5 h-5" />
              </TrackedLink>
              <TrackedLink
                href="https://www.facebook.com/people/MiMundo3D/61590489636586/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className={socialClass}
                eventName="select_content"
                eventParams={{ content_type: 'social_link', item_id: 'facebook' }}
              >
                <FacebookIcon className="w-5 h-5" />
              </TrackedLink>
              <TrackedLink
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className={socialClass}
                eventName="generate_lead"
                eventParams={{ method: 'whatsapp', source: 'footer' }}
              >
                <WhatsAppIcon className="w-5 h-5" />
              </TrackedLink>
            </div>
          </div>

          <div>
            <h4 className={headingClass}>Explora</h4>
            <nav className="flex flex-col gap-3">
              <NavLink href="/">Inicio</NavLink>
              <NavLink href="/catalogo">Catálogo de Productos</NavLink>
              {HOME_CATEGORIES.map((category) => (
                <NavLink key={category.slug} href={`/categorias/${category.slug}`}>
                  {category.dbName}
                </NavLink>
              ))}
              <a href="#" className={linkClass}>
                <span className="w-0 h-px bg-white transition-all duration-300 group-hover/link:w-3" />
                Términos de Servicio
              </a>
            </nav>
          </div>

          <div>
            <h4 className={headingClass}>Contacto</h4>
            <ul className="flex flex-col gap-4 text-sm">
              <li className="flex items-center gap-3">
                <span className={chipClass}>
                  <Mail className="w-4 h-4" />
                </span>
                <TrackedLink
                  href={`https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/90 hover:text-white transition-colors break-all"
                  eventName="generate_lead"
                  eventParams={{ method: 'email', source: 'footer' }}
                >
                  {EMAIL}
                </TrackedLink>
              </li>
              <li className="flex items-center gap-3">
                <span className={chipClass}>
                  <Phone className="w-4 h-4" />
                </span>
                <TrackedLink
                  href="tel:+526691224168"
                  className="text-white/90 hover:text-white transition-colors"
                  eventName="generate_lead"
                  eventParams={{ method: 'phone', source: 'footer' }}
                >
                  +52 (669) 122-4168
                </TrackedLink>
              </li>
              <li className="flex items-center gap-3">
                <span className={chipClass}>
                  <MapPin className="w-4 h-4" />
                </span>
                <span className="text-white/90">Mazatlán, Sinaloa</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="mt-14 py-6 border-t border-white/25 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 text-xs text-white/90">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} MIMUNDO3D. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span>Hecho con ♥ en Mazatlán, Sinaloa</span>
            <a
              href="#"
              aria-label="Volver arriba"
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white text-white hover:text-primary-dark ring-1 ring-white/25 flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            >
              <ArrowUp className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
