-- =========================================================
-- MIMUNDO3D — Redirección corta de redes sociales por cliente
-- Pegar y ejecutar en el SQL Editor de Supabase. Seguro de re-correr.
-- Se usa desde /admin/redes (edición) y /r/[client_id]/[red] (redirección).
-- =========================================================

create table if not exists public.client_social_links (
  id uuid primary key default gen_random_uuid(),
  client_id bigint not null references public.clients(id) on delete cascade,
  network text not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, network)
);

create index if not exists client_social_links_client_id_idx on public.client_social_links (client_id);

drop trigger if exists set_updated_at on public.client_social_links;
create trigger set_updated_at
  before update on public.client_social_links
  for each row execute function public.set_updated_at();

-- Sin políticas: sólo el service role (supabaseAdmin) lee/escribe.
alter table public.client_social_links enable row level security;
