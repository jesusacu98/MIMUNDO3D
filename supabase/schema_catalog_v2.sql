-- =========================================================
-- MIMUNDO3D — Imágenes adicionales por producto (además de la
-- portada en products.image_url).
-- Pegar y ejecutar en el SQL Editor de Supabase.
-- =========================================================

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx on public.product_images (product_id, display_order);

-- RLS: misma política que products — lectura pública, sólo la service
-- role key (supabaseAdmin) inserta/borra desde /admin.
alter table public.product_images enable row level security;

create policy "Public read access" on public.product_images
  for select using (true);
