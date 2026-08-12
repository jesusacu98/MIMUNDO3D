-- =========================================================
-- MIMUNDO3D — Pedidos con varios productos (order_items)
-- Pegar y ejecutar en el SQL Editor de Supabase DESPUÉS de schema_business.sql,
-- schema_business_v2.sql. Migra los datos existentes: NO volver a correr este
-- archivo una segunda vez (las columnas de origen se eliminan al final).
-- =========================================================

-- ---------------------------------------------------------
-- Líneas de producto de un pedido (un pedido puede tener varias)
-- ---------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  cost numeric(10,2) check (cost is null or cost >= 0),
  makerworld_link text,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);

alter table public.order_items enable row level security;

-- ---------------------------------------------------------
-- Migrar cada pedido existente (un producto) a una línea en order_items
-- ---------------------------------------------------------
insert into public.order_items (order_id, product_id, product_name, quantity, sale_price, cost, makerworld_link)
select id, product_id, product_name, quantity, sale_price, cost, makerworld_link
from public.orders;

-- ---------------------------------------------------------
-- Quitar de orders las columnas que ahora viven en order_items.
-- profit se dropea primero por ser una columna generada que depende de
-- sale_price/cost.
-- ---------------------------------------------------------
alter table public.orders drop column if exists profit;
alter table public.orders drop column if exists product_name;
alter table public.orders drop column if exists product_id;
alter table public.orders drop column if exists quantity;
alter table public.orders drop column if exists sale_price;
alter table public.orders drop column if exists cost;
alter table public.orders drop column if exists makerworld_link;
