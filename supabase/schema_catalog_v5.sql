-- =========================================================
-- MIMUNDO3D — Productos destacados en el inicio (carruseles)
-- Pegar y ejecutar en el SQL Editor de Supabase. Seguro de re-correr.
-- Se marcan al dar de alta/editar un producto en /admin/productos y alimentan
-- los carruseles "Tendencia", "Novedades" y "Promociones y descuentos" del home.
-- =========================================================

alter table public.products
  add column if not exists is_trending boolean not null default false,
  add column if not exists is_new boolean not null default false,
  add column if not exists is_promo boolean not null default false;
