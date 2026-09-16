import Image from 'next/image';
import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import TrackedLink from '@/components/TrackedLink';
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from './icons';

const WHATSAPP_NUMBER = '526691224168';
const WHATSAPP_MESSAGE = encodeURIComponent(
  "¡Hola, MiMundo3D! 👋✨\n\n💡 Tengo una idea en mente que quiero materializar en 3D 🚀🤖.\n¿Les puedo compartir una foto 📸 o un modelo 🪐 para que me ayuden a cotizarlo? 🛠️\n\n¡Quedo atento! 📥"
);
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

export default function CatalogFooter() {
  return (
    <footer className="mt-auto bg-primary py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4 bg-white w-fit px-3 py-1.5 rounded-lg">
            <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-6 w-auto" />
          </div>
          <p className="text-sm text-white/80 max-w-xs">Donde tus ideas toman forma.</p>
        </div>
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Contacto</h4>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-white" />
              <TrackedLink
                href="https://mail.google.com/mail/?view=cm&fs=1&to=mimundo3d.studio@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                eventName="generate_lead"
                eventParams={{ method: 'email', source: 'footer' }}
              >
                mimundo3d.studio@gmail.com
              </TrackedLink>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-white" />
              <TrackedLink
                href="tel:+526691224168"
                className="hover:text-white transition-colors"
                eventName="generate_lead"
                eventParams={{ method: 'phone', source: 'footer' }}
              >
                +52 (669) 122-4168
              </TrackedLink>
            </li>
            <li className="flex items-center gap-2">
              <WhatsAppIcon className="w-4 h-4 text-white" />
              <TrackedLink
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                eventName="generate_lead"
                eventParams={{ method: 'whatsapp', source: 'footer' }}
              >
                WhatsApp
              </TrackedLink>
            </li>
            <li className="flex items-center gap-2">
              <InstagramIcon className="w-4 h-4 text-white" />
              <TrackedLink
                href="https://www.instagram.com/mimundo3d.studio/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                eventName="select_content"
                eventParams={{ content_type: 'social_link', item_id: 'instagram' }}
              >
                Instagram
              </TrackedLink>
            </li>
            <li className="flex items-center gap-2">
              <FacebookIcon className="w-4 h-4 text-white" />
              <TrackedLink
                href="https://www.facebook.com/people/MiMundo3D/61590489636586/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                eventName="select_content"
                eventParams={{ content_type: 'social_link', item_id: 'facebook' }}
              >
                Facebook
              </TrackedLink>
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
            <Link href="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            <Link href="/catalogo" className="hover:text-white transition-colors">
              Catálogo de Productos
            </Link>
            <a href="#" className="hover:text-white transition-colors">
              Términos de Servicio
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-white/20 text-center text-xs text-white">
        <p>© {new Date().getFullYear()} MIMUNDO3D. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
