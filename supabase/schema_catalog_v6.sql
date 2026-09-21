-- =========================================================
-- MIMUNDO3D — Banners administrables (public.banners)
-- Pegar y ejecutar en el SQL Editor de Supabase. Seguro de re-correr
-- (también actualiza la tabla si ya habías corrido una versión anterior).
-- Se gestionan en /admin/banners. Ubicaciones (placement):
--   home          → slider principal arriba del inicio
--   catalog       → slider arriba de /catalogo
--   home_category → imagen de una categoría en "Explora por categoría" del inicio (requiere category_id)
--   category_page → slider arriba de /categorias/[categoria]           (requiere category_id)
-- Las imágenes subidas desde el admin viven en el bucket público
-- `imagenes_sitio`, carpeta banners/.
-- =========================================================

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  -- Nombre interno; también se usa como texto alternativo de la imagen.
  title text not null,
  image_url text not null,
  -- Opcional: versión para celular. Si falta, se recorta la de escritorio.
  mobile_image_url text,
  -- Opcional: ruta interna (/catalogo) o URL https:// a la que lleva el banner.
  link_url text,
  placement text not null default 'home',
  category_id uuid references public.product_categories(id) on delete cascade,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Por si la tabla se creó con la versión anterior de este archivo.
alter table public.banners
  add column if not exists category_id uuid references public.product_categories(id) on delete cascade;

alter table public.banners drop constraint if exists banners_placement_check;
alter table public.banners
  add constraint banners_placement_check
  check (placement in ('home', 'catalog', 'home_category', 'category_page'));

alter table public.banners drop constraint if exists banners_category_required_check;
alter table public.banners
  add constraint banners_category_required_check
  check ((placement in ('home_category', 'category_page')) = (category_id is not null));

create index if not exists banners_placement_idx on public.banners (placement, display_order);

create or replace trigger set_updated_at
  before update on public.banners
  for each row execute function public.set_updated_at();

-- RLS: lectura pública sólo de banners activos; escritura sólo con la service role key.
alter table public.banners enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'banners' and policyname = 'Public read access to active banners'
  ) then
    create policy "Public read access to active banners" on public.banners
      for select using (is_active = true);
  end if;
end
$$;
