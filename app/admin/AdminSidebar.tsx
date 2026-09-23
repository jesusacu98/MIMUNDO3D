'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Calculator,
  ClipboardList,
  ExternalLink,
  GalleryHorizontal,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  PiggyBank,
  QrCode,
  Settings,
  Sparkles,
  Tags,
  Users,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: '/admin', label: 'Panel', icon: LayoutDashboard }] },
  {
    title: 'Operación',
    items: [
      { href: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
      { href: '/admin/clientes', label: 'Clientes', icon: Users },
      { href: '/admin/ideas', label: 'Ideas (chat IA)', icon: Sparkles },
      { href: '/admin/ideas/configuracion', label: 'Configuración IA', icon: Settings },
      { href: '/admin/notificaciones', label: 'Notificaciones', icon: Bell },
      { href: '/admin/inversion', label: 'Inversión', icon: PiggyBank },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { href: '/admin/productos', label: 'Productos', icon: Package },
      { href: '/admin/categorias', label: 'Categorías', icon: Tags },
      { href: '/admin/subcategorias', label: 'Subcategorías', icon: Layers },
      { href: '/admin/banners', label: 'Banners', icon: GalleryHorizontal },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { href: '/admin/calculadora', label: 'Calculadora de costos', icon: Calculator },
      { href: '/admin/qr', label: 'Generador de QR', icon: QrCode },
      { href: '/admin/disenos', label: 'Generador de diseños', icon: Wand2 },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function matches(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/');
}

// Con rutas anidadas (ej. /admin/ideas y /admin/ideas/configuracion) más de un ítem puede calzar
// por prefijo; gana el href más específico (el más largo), no simplemente "el primero que calce".
function bestMatchHref(pathname: string): string | null {
  let best: string | null = null;
  for (const item of ALL_ITEMS) {
    if (matches(pathname, item.href) && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}

interface AdminSidebarProps {
  email: string;
  signOutAction: () => void | Promise<void>;
}

function NavContent({ email, signOutAction, pathname }: AdminSidebarProps & { pathname: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5">
        <Link href="/admin" aria-label="Panel de administración">
          <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-7 w-auto" />
        </Link>
        <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-zinc-400">Administración</p>
      </div>

      <nav aria-label="Administración" className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
        {NAV_GROUPS.map((group, i) => (
          <div key={group.title ?? i}>
            {group.title && <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">{group.title}</p>}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = item.href === bestMatchHref(pathname);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active ? 'bg-primary/10 text-primary' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          active ? 'bg-primary text-white shadow-md shadow-primary/25' : 'bg-zinc-100 text-zinc-500 group-hover:bg-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-zinc-200/80 p-3 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Ver sitio
        </Link>
        <Link
          href="/catalogo"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 transition-colors"
        >
          <LayoutGrid className="w-4 h-4" />
          Ver catálogo
        </Link>
        <div className="pt-3 mt-2 border-t border-zinc-100 px-3">
          <p className="text-xs text-zinc-500 truncate mb-2" title={email}>
            {email}
          </p>
          <form action={signOutAction}>
            <SubmitButton className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all cursor-pointer">
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminSidebar({ email, signOutAction }: AdminSidebarProps) {
  const pathname = usePathname();
  // El menú del celular se considera abierto sólo en la ruta donde se abrió:
  // al navegar a otra página se cierra solo.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenedAt(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  const currentLabel = ALL_ITEMS.find((item) => item.href === bestMatchHref(pathname))?.label ?? 'Administración';

  return (
    <>
      {/* Escritorio: menú lateral fijo */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-zinc-200/80">
        <NavContent email={email} signOutAction={signOutAction} pathname={pathname} />
      </aside>

      {/* Celular / tablet: barra superior + menú deslizable */}
      <header className="lg:hidden sticky top-0 z-40 h-14 flex items-center gap-3 px-4 bg-white/90 backdrop-blur-md border-b border-zinc-200/80">
        <button
          type="button"
          onClick={() => setOpenedAt(pathname)}
          aria-label="Abrir menú"
          aria-expanded={open}
          className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-zinc-700 hover:bg-zinc-100 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-zinc-950 truncate">{currentLabel}</span>
        <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-5 w-auto ml-auto shrink-0" />
      </header>

      <div className={`lg:hidden fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
        <div
          onClick={() => setOpenedAt(null)}
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menú de administración"
          className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <button
            type="button"
            onClick={() => setOpenedAt(null)}
            aria-label="Cerrar menú"
            className="absolute top-4 right-3 w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:bg-zinc-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <NavContent email={email} signOutAction={signOutAction} pathname={pathname} />
        </aside>
      </div>
    </>
  );
}
