-- =========================================================
-- MIMUNDO3D — Esquema del catálogo (product_categories, products, product_colors)
-- Pegar y ejecutar en el SQL Editor de Supabase.
-- =========================================================

create extension if not exists pgcrypto;

-- Función genérica para mantener updated_at al día en cada UPDATE
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------
-- Categorías del catálogo
-- ---------------------------------------------------------
create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.product_categories;
create trigger set_updated_at
  before update on public.product_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Paleta de colores disponible (global, aplica a todos los productos por ahora)
-- ---------------------------------------------------------
create table if not exists public.product_colors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  hex_code text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- Productos
-- ---------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete restrict,
  name text not null,
  description text not null,
  -- Monto puro en MXN, sin símbolo "$" ni texto "Desde" (eso lo arma el frontend).
  price numeric(10,2) not null check (price >= 0),
  -- true = "Desde $X MXN" (precio variable/personalización), false = "$X MXN" (precio fijo).
  is_starting_price boolean not null default true,
  image_url text not null,
  is_personalizable boolean not null default false,
  has_business_info boolean not null default false,
  has_character_option boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_active_order_idx on public.products (is_active, display_order);

drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- RLS: lectura pública (catálogo = contenido de marketing, sin datos sensibles).
-- Sin políticas de escritura: sólo la service role key (supabaseAdmin) puede
-- insertar/editar/borrar, igual que clients/client_bank_accounts.
-- ---------------------------------------------------------
alter table public.product_categories enable row level security;
alter table public.product_colors enable row level security;
alter table public.products enable row level security;

create policy "Public read access" on public.product_categories
  for select using (true);

create policy "Public read access" on public.product_colors
  for select using (true);

create policy "Public read access to active products" on public.products
  for select using (is_active = true);
