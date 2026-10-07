-- =========================================================
-- MIMUNDO3D — Publicar anuncios en Instagram y Facebook (/admin/redes, /admin/anuncios)
-- Pegar y ejecutar en el SQL Editor de Supabase. Seguro de re-correr.
--
-- social_settings: la conexión con Meta, editable desde /admin/redes (mismo criterio que
--   notify_settings / idea_settings: clave/valor, sin variables de entorno, aplica al instante).
--   Guarda el token de la Página de Facebook (no vence si se obtuvo de un token de usuario de
--   larga duración), el id de la Página y el id/usuario de Instagram. NO guarda el App Secret:
--   sólo se usa en el momento de conectar. Sin políticas: sólo el service role la lee/escribe.
--
-- ad_creatives.published: dónde se publicó cada anuncio generado
--   [{ network: 'instagram' | 'facebook', kind: 'post' | 'story', id, url, at }]
-- =========================================================

create table if not exists public.social_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.social_settings;
create trigger set_updated_at
  before update on public.social_settings
  for each row execute function public.set_updated_at();

alter table public.social_settings enable row level security;

alter table public.ad_creatives
  add column if not exists published jsonb not null default '[]'::jsonb;
