'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, House, LayoutDashboard, Menu, Sparkles, Store, Tags, X } from 'lucide-react';
import { HOME_CATEGORIES } from '@/lib/homeCategories';
import { useIsAdmin } from '@/lib/useIsAdmin';

// Cabecera compartida del sitio público (home, catálogo, ficha de producto, categorías e ideas).
// Diseño minimalista: enlaces de texto con un subrayado como único indicador de la página activa
// en escritorio, y en celular una tarjeta flotante con overlay (mismo lenguaje visual que el panel
// "Mi cotización" de /ideas) con una fila por ítem, icono y la fila activa resaltada.
//
// "Categorías" es un desplegable (no un Link: no existe una página índice /categorias) que lista
// HOME_CATEGORIES — así se sostiene si en el futuro hay más de las 3 actuales sin llenar la barra.
//
// El panel y el overlay de celular se renderizan FUERA de <header>: si fueran descendientes del
// header (que tiene backdrop-blur) su `position: fixed` se ubicaría relativo a ese ancestro en vez
// de la ventana, porque backdrop-filter crea un "containing block" igual que filter/transform.

const NAV_LEFT = [
  { href: '/', label: 'Inicio', icon: House },
  { href: '/catalogo', label: 'Catálogo', icon: Store },
] as const;
const NAV_RIGHT = [{ href: '/ideas', label: 'Ideas', icon: Sparkles }] as const;

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}
const categoriesActive = (pathname: string) => pathname.startsWith('/categorias');

const linkClass = (active: boolean) => `relative py-1 text-sm font-medium transition-colors ${active ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-900'}`;
const underlineClass = (active: boolean) => `pointer-events-none absolute inset-x-0 -bottom-[3px] h-[2px] rounded-full bg-primary transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`;

function NavLink({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
      {label}
      <span className={underlineClass(active)} />
    </Link>
  );
}

/** Desplegable "Categorías" de escritorio: se abre con clic, se cierra con clic fuera, Escape o al elegir una. */
function CategoriesMenu({ active, onNavigate }: { active: boolean; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${linkClass(active || open)} inline-flex items-center gap-1 cursor-pointer`}
      >
        Categorías
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        <span className={underlineClass(active || open)} />
      </button>

      {open && (
        <div role="menu" className="absolute left-1/2 top-full z-10 mt-3 w-52 -translate-x-1/2 rounded-2xl border border-zinc-100 bg-white p-1.5 shadow-lg shadow-zinc-900/10">
          {HOME_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/categorias/${category.slug}`}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onNavigate();
              }}
              className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
            >
              {category.dbName}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const mobileRowClass = (active: boolean) =>
  `flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-medium transition-colors ${
    active ? 'bg-primary/8 text-primary-dark' : 'text-zinc-700 hover:bg-zinc-50'
  }`;

function MobileNavLink({ href, label, icon: Icon, active, onClick }: { href: string; label: string; icon: typeof House; active: boolean; onClick: () => void }) {
  return (
    <li>
      <Link href={href} onClick={onClick} aria-current={active ? 'page' : undefined} className={mobileRowClass(active)}>
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} />
        {label}
      </Link>
    </li>
  );
}

/** Igual que el desplegable de escritorio, pero como acordeón dentro de la tarjeta de celular. */
function MobileCategoriesAccordion({ active, onNavigate }: { active: boolean; onNavigate: () => void }) {
  const [open, setOpen] = useState(active);

  return (
    <li>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`w-full cursor-pointer ${mobileRowClass(active)} justify-between`}>
        <span className="flex items-center gap-3">
          <Tags className="h-[18px] w-[18px] shrink-0" strokeWidth={2.25} />
          Categorías
        </span>
        <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <ul className="min-h-0 space-y-1 py-1 pl-4">
          {HOME_CATEGORIES.map((category) => (
            <li key={category.slug} className="border-l-2 border-zinc-100 pl-3">
              <Link href={`/categorias/${category.slug}`} onClick={onNavigate} className="block rounded-lg py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-950">
                {category.dbName}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Bloquea el scroll del fondo mientras el menú está abierto.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const catsActive = categoriesActive(pathname);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="MiMundo3D, ir al inicio" onClick={close} className="min-w-0 shrink-0">
            <Image src="/logo.png" alt="MIMUNDO3D" width={1024} height={161} className="h-6 w-auto sm:h-7" priority />
          </Link>

          {/* Escritorio: enlaces en línea */}
          <nav className="hidden items-center gap-8 sm:flex">
            {NAV_LEFT.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={isActive(pathname, item.href)} />
            ))}
            <CategoriesMenu active={catsActive} onNavigate={close} />
            {NAV_RIGHT.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={isActive(pathname, item.href)} />
            ))}
            {isAdmin && <NavLink href="/admin" label="Admin" active={isActive(pathname, '/admin')} />}
          </nav>

          {/* Celular: botón de menú */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 sm:hidden cursor-pointer"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Celular: overlay + tarjeta flotante (fuera de <header> a propósito, ver nota arriba).
          z-50 (no z-40) a propósito: en /ideas la barra superior del chat también es "sticky" con
          z-40 y se pinta después en el documento — con el mismo z-index tapaba el primer ítem del
          menú ("Inicio"). z-50 iguala al <header> y queda siempre por encima de cualquier barra
          sticky de una página. */}
      <div
        aria-hidden={!open}
        onClick={close}
        className={`fixed inset-0 z-50 bg-zinc-950/30 backdrop-blur-[2px] transition-opacity duration-200 sm:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        inert={!open}
        className={`fixed inset-x-3 top-[4.5rem] z-50 origin-top rounded-3xl bg-white shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-900/5 transition-all duration-200 sm:hidden ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
        }`}
      >
        <nav className="max-h-[calc(100vh-6rem)] overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV_LEFT.map((item) => (
              <MobileNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(pathname, item.href)} onClick={close} />
            ))}
            <MobileCategoriesAccordion active={catsActive} onNavigate={close} />
            {NAV_RIGHT.map((item) => (
              <MobileNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} active={isActive(pathname, item.href)} onClick={close} />
            ))}
            {isAdmin && <MobileNavLink href="/admin" label="Admin" icon={LayoutDashboard} active={isActive(pathname, '/admin')} onClick={close} />}
          </ul>
        </nav>
      </div>
    </>
  );
}
