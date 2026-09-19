-- =========================================================
-- MIMUNDO3D — Subcategorías administrables (product_subcategories)
-- Pegar y ejecutar en el SQL Editor de Supabase DESPUÉS de schema_catalog_v3.sql.
-- Seguro de re-correr. Reemplaza el texto libre products.subcategory por una
-- tabla propia (como product_categories) y products.subcategory_id.
-- =========================================================

create table if not exists public.product_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, name)
);

create index if not exists product_subcategories_category_id_idx on public.product_subcategories (category_id, display_order);

create or replace trigger set_updated_at
  before update on public.product_subcategories
  for each row execute function public.set_updated_at();

-- RLS: lectura pública (alimenta los filtros de /categorias/[categoria]),
-- escritura sólo con la service role key (supabaseAdmin desde /admin).
alter table public.product_subcategories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_subcategories' and policyname = 'Public read access'
  ) then
    create policy "Public read access" on public.product_subcategories
      for select using (true);
  end if;
end
$$;

alter table public.products
  add column if not exists subcategory_id uuid references public.product_subcategories(id) on delete set null;

create index if not exists products_subcategory_id_idx on public.products (subcategory_id);

-- Migrar lo que ya se hubiera capturado como texto en products.subcategory.
insert into public.product_subcategories (category_id, name)
select distinct category_id, btrim(subcategory)
from public.products
where subcategory is not null and btrim(subcategory) <> ''
on conflict (category_id, name) do nothing;

update public.products p
set subcategory_id = s.id
from public.product_subcategories s
where p.subcategory_id is null
  and p.subcategory is not null
  and s.category_id = p.category_id
  and s.name = btrim(p.subcategory);

-- La columna de texto products.subcategory (schema_catalog_v3.sql) queda sin uso.
-- Este script no la elimina.
