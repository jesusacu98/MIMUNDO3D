import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import IdeasChatLoader from './IdeasChatLoader';

export const metadata: Metadata = {
  title: 'Ideas para tu proyecto en 3D | MiMundo3D',
  description: 'Cuéntanos qué necesitas y te sugerimos ideas de productos impresos en 3D. Guarda las que te gusten y envíalas a cotizar por WhatsApp.',
};

export default function IdeasPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 selection:bg-primary selection:text-white">
      <SiteHeader />

      <IdeasChatLoader />
    </div>
  );
}
