-- =========================================================
-- MIMUNDO3D — Historial del generador de diseños (/admin/disenos)
-- Pegar y ejecutar en el SQL Editor de Supabase. Seguro de re-correr.
--
-- design_history: cada generación (descripción + bocetos + PNG "para Fusion" de cada uno), para
--   poder reabrirla después de refrescar. Las imágenes viven en el bucket público
--   `imagenes_sitio`, carpeta `disenos/` (lib/storage.ts); aquí sólo se guardan sus URLs.
--   No se guardan los logos de referencia que se adjuntan ni los STL.
--
-- Sin políticas: sólo el service role (supabaseAdmin) lee/escribe.
-- =========================================================

create table if not exists public.design_history (
  id uuid primary key default gen_random_uuid(),
  -- 'expositor' | 'libre'
  kind text not null default 'expositor',
  description text not null,
  -- Modelo de imagen usado en esta generación.
  model text not null default '',
  image_urls text[] not null default '{}',
  -- PNG para Fusion por variante: { "0": "https://…", "2": "https://…" } (clave = índice del boceto).
  fusion_urls jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists design_history_created_at_idx on public.design_history (created_at desc);

drop trigger if exists set_updated_at on public.design_history;
create trigger set_updated_at
  before update on public.design_history
  for each row execute function public.set_updated_at();

alter table public.design_history enable row level security;
