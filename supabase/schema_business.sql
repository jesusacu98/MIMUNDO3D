-- =========================================================
-- MIMUNDO3D — Esquema del negocio (orders, investments)
-- Pegar y ejecutar en el SQL Editor de Supabase.
-- Reemplaza el Excel de seguimiento (pedidos, inversión, dashboard).
-- =========================================================

create extension if not exists pgcrypto;

-- Por si este archivo se corre antes que schema_catalog.sql / schema_auth.sql
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_date date,
  client_name text not null,
  product_name text not null,
  -- Montos puros en MXN, sin símbolo "$". Nulos cuando el pedido aún no
  -- tiene precio/costo definido (ej. "Pendiente Cotizar").
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  cost numeric(10,2) check (cost is null or cost >= 0),
  profit numeric(10,2) generated always as (coalesce(sale_price, 0) - coalesce(cost, 0)) stored,
  payment_status text check (payment_status is null or payment_status in ('Pagado', 'Pendiente')),
  payment_method text,
  order_status text not null default 'Pendiente Cotizar'
    check (order_status in ('Pendiente Cotizar', 'Imprimiendo', 'Entregado', 'Cancelado')),
  makerworld_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_order_date_idx on public.orders (order_date);
create index if not exists orders_status_idx on public.orders (order_status);

drop trigger if exists set_updated_at on public.orders;
create trigger set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Inversión inicial / gastos del negocio
-- ---------------------------------------------------------
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  expense_date date,
  description text not null,
  cost numeric(10,2) not null check (cost >= 0),
  paid_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investments_expense_date_idx on public.investments (expense_date);

drop trigger if exists set_updated_at on public.investments;
create trigger set_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- RLS: datos internos del negocio, sin lectura pública.
-- Sin políticas: sólo la service role key (supabaseAdmin) puede
-- leer/insertar/editar/borrar, igual que clients/client_bank_accounts.
-- ---------------------------------------------------------
alter table public.orders enable row level security;
alter table public.investments enable row level security;
