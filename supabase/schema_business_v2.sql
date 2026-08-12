-- =========================================================
-- MIMUNDO3D — Costo de fabricación por producto + vínculo pedido↔producto
-- Pegar y ejecutar en el SQL Editor de Supabase DESPUÉS de schema_catalog.sql
-- y schema_business.sql. Usa ALTER ... IF NOT EXISTS, seguro de re-correr.
-- =========================================================

-- Costo de fabricación del producto (materiales, tiempo, etc.). Sólo se
-- muestra en /admin — el catálogo público nunca selecciona esta columna.
alter table public.products
  add column if not exists cost numeric(10,2) check (cost is null or cost >= 0);

-- Vínculo opcional de un pedido a un producto del catálogo, para calcular
-- el costo del pedido automáticamente (cost del producto × cantidad).
-- Nulo = pedido personalizado/fuera de catálogo (como los históricos migrados).
alter table public.orders
  add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.orders
  add column if not exists quantity integer not null default 1 check (quantity > 0);

create index if not exists orders_product_id_idx on public.orders (product_id);
