-- =========================================================
-- MIMUNDO3D — Roles de usuario para el admin (sobre Supabase Auth)
-- Pegar y ejecutar en el SQL Editor de Supabase.
-- No crea usuarios: Supabase Auth (auth.users) ya los maneja.
-- Esta tabla sólo guarda el rol de cada usuario autenticado.
-- =========================================================

-- Por si este archivo se corre antes que schema_catalog.sql
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.user_roles;
create trigger set_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

alter table public.user_roles enable row level security;

-- Cada usuario sólo puede leer su propio rol (necesario para que el
-- middleware / Server Components verifiquen el rol con la sesión del usuario).
create policy "Users can read their own role" on public.user_roles
  for select using (auth.uid() = user_id);

-- Sin políticas de insert/update/delete: nadie puede cambiar su propio rol
-- desde el cliente. Sólo la service role key (supabaseAdmin) puede promover
-- a alguien a 'admin' (ver scripts/create_admin.js).

-- ---------------------------------------------------------
-- Crea automáticamente la fila de rol ('user' por defecto, NO admin) cada
-- vez que alguien se registra en auth.users, para que nunca falte un rol.
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
