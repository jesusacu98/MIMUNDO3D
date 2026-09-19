-- =========================================================
-- MIMUNDO3D — Tipo de producto (subcategoría) para filtrar dentro de cada categoría
-- Pegar y ejecutar en el SQL Editor de Supabase. Seguro de re-correr.
-- Se edita en /admin/productos (campo "Tipo de producto") y alimenta los
-- filtros de /categorias/[categoria] (?tipo=...).
-- =========================================================

alter table public.products
  add column if not exists subcategory text;
