-- =========================================================
-- MIMUNDO3D — Anticipo y chat de WhatsApp/Meta Business por pedido
-- Pegar y ejecutar en el SQL Editor de Supabase. Usa ALTER ... IF NOT EXISTS,
-- seguro de re-correr.
-- =========================================================

alter table public.orders
  add column if not exists advance_amount numeric(10,2) check (advance_amount is null or advance_amount >= 0);

-- Link o número del chat de WhatsApp/Meta Business asociado al pedido.
-- Texto libre (puede ser una URL tipo wa.me/... o sólo el número).
alter table public.orders
  add column if not exists whatsapp_link text;
