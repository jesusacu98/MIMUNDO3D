-- =========================================================
-- MIMUNDO3D — Un banner en varias secciones (public.banner_placements)
-- Pegar y ejecutar en el SQL Editor de Supabase DESPUÉS de schema_catalog_v6.sql.
-- Seguro de re-correr. Antes cada banner tenía UNA ubicación (banners.placement /
-- banners.category_id); ahora la lista de ubicaciones vive en banner_placements
-- (una fila por sección donde se muestra) y esas dos columnas se eliminan,
-- copiando antes lo que ya tenían.
--   placement: home | catalog | home_category | category_page
--   category_id: obligatorio en home_category y category_page, nulo en las demás.
-- =========================================================

create table if not exists public.banner_placements (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.banners(id) on delete cascade,
  placement text not null check (placement in ('home', 'catalog', 'home_category', 'category_page')),
  category_id uuid references public.product_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((placement in ('home_category', 'category_page')) = (category_id is not null))
);

-- Un banner no puede estar dos veces en la misma sección.
create unique index if not exists banner_placements_unique_idx
  on public.banner_placements (banner_id, placement, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists banner_placements_lookup_idx on public.banner_placements (placement, category_id);

-- RLS: lectura pública sólo de ubicaciones de banners activos; escritura sólo con la service role key.
alter table public.banner_placements enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'banner_placements' and policyname = 'Public read access to active banner placements'
  ) then
    create policy "Public read access to active banner placements" on public.banner_placements
      for select using (exists (select 1 from public.banners b where b.id = banner_id and b.is_active = true));
  end if;
end
$$;

-- Migrar las ubicaciones actuales y quitar las columnas viejas (sólo si todavía existen).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'banners' and column_name = 'placement'
  ) then
    insert into public.banner_placements (banner_id, placement, category_id)
    select id, placement, category_id from public.banners
    on conflict do nothing;

    alter table public.banners drop constraint if exists banners_placement_check;
    alter table public.banners drop constraint if exists banners_category_required_check;
    drop index if exists public.banners_placement_idx;
    alter table public.banners drop column placement;
    alter table public.banners drop column category_id;
  end if;
end
$$;
