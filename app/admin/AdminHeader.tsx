import Image from 'next/image';
import Link from 'next/link';
import { Home, LayoutGrid, LayoutDashboard, Package, Tags, LogOut } from 'lucide-react';
import { signOutAction } from './actions';

const navIconClass =
  'p-1.5 sm:p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors';

export default function AdminHeader({ email }: { email: string }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-5 sm:h-6 md:h-8 w-auto shrink-0" />
          <nav className="flex flex-wrap items-center gap-1">
            <Link href="/" aria-label="Inicio" title="Inicio" className={navIconClass}>
              <Home className="w-4 h-4" />
            </Link>
            <Link href="/catalogo" aria-label="Catálogo" title="Catálogo" className={navIconClass}>
              <LayoutGrid className="w-4 h-4" />
            </Link>
            <Link href="/admin" aria-label="Panel" title="Panel" className={navIconClass}>
              <LayoutDashboard className="w-4 h-4" />
            </Link>
            <Link href="/admin/productos" aria-label="Productos" title="Productos" className={navIconClass}>
              <Package className="w-4 h-4" />
            </Link>
            <Link href="/admin/categorias" aria-label="Categorías" title="Categorías" className={navIconClass}>
              <Tags className="w-4 h-4" />
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-zinc-500 hidden md:inline truncate max-w-[200px]">{email}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
