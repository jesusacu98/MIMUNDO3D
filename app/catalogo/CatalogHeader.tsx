import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AdminNavLink from '@/components/AdminNavLink';

export default function CatalogHeader() {
  return (
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
          <AdminNavLink className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors" />
        </nav>
      </div>
    </header>
  );
}
