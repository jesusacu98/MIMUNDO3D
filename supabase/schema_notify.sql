-- =========================================================
-- MIMUNDO3D — Aviso por correo cuando falla una llamada a IA
-- Pegar y ejecutar en el SQL Editor de Supabase. Seguro de re-correr.
--
-- notify_settings: configuración editable desde /admin/notificaciones (servidor/puerto/usuario
-- SMTP, la contraseña de aplicación, y el correo que recibe los avisos). Mismo criterio que
-- idea_settings (ver schema_ideas.sql): no vive en variables de entorno, se administra desde el
-- admin y aplica al instante, sin redeploy. Fila por fila (clave/valor); si una clave no existe,
-- el código usa un valor por defecto razonable (ver lib/notify/settings.ts).
--
-- Sin políticas: sólo el service role (supabaseAdmin) lee/escribe.
-- =========================================================

create table if not exists public.notify_settings (
  key text primary key,
  -- text plano (incluida la contraseña SMTP): esta tabla sin políticas sólo la lee/escribe
  -- supabaseAdmin, el mismo nivel de confianza que ya tienen idea_settings o client_bank_accounts.
  value text,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.notify_settings;
create trigger set_updated_at
  before update on public.notify_settings
  for each row execute function public.set_updated_at();

alter table public.notify_settings enable row level security;
