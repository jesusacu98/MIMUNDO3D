-- =========================================================
-- MIMUNDO3D — Generador de anuncios (/admin/anuncios)
-- Pegar y ejecutar en el SQL Editor de Supabase. Seguro de re-correr.
--
-- ad_creatives: historial de anuncios generados (imágenes + descripción + hashtags), para poder
--   reabrirlos, copiar el texto otra vez o descargarlos de nuevo. Las imágenes viven en el bucket
--   público `imagenes_sitio`, carpeta `anuncios/` (lib/storage.ts); aquí sólo se guardan sus URLs.
--   Se guardan los nombres de los productos como texto para que el historial siga legible aunque
--   el producto se borre del catálogo.
--
-- Sin políticas: sólo el service role (supabaseAdmin) lee/escribe.
-- =========================================================

create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  -- 'destacado' | 'oferta' | 'novedad' | 'coleccion'
  ad_type text not null,
  -- 'llamativo' | 'profesional' | 'minimalista' | 'calido' | 'crudo' | 'premium'
  style text not null,
  -- 'feed' (4:5) | 'cuadrado' (1:1) | 'historia' (9:16)
  format text not null,
  product_ids uuid[] not null default '{}',
  product_names text[] not null default '{}',
  -- Título del carrusel, % de descuento, vigencia, nota extra, etc.
  options jsonb not null default '{}'::jsonb,
  image_urls text[] not null default '{}',
  -- Descripción elegida/editada para publicar (sin hashtags).
  caption text not null default '',
  -- Todas las variantes que propuso la IA: [{ label, text }]
  variants jsonb not null default '[]'::jsonb,
  hashtags text[] not null default '{}',
  -- Versión corta para estado/chat de WhatsApp (sin hashtags).
  whatsapp_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ad_creatives_created_at_idx on public.ad_creatives (created_at desc);

drop trigger if exists set_updated_at on public.ad_creatives;
create trigger set_updated_at
  before update on public.ad_creatives
  for each row execute function public.set_updated_at();

alter table public.ad_creatives enable row level security;
