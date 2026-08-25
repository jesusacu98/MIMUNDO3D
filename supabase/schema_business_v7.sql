-- =========================================================
-- MIMUNDO3D — Logo de negocio en clientes NFC
-- Pegar y ejecutar en el SQL Editor de Supabase. Usa ALTER ... IF NOT EXISTS,
-- seguro de re-correr.
-- =========================================================

alter table public.clients
  add column if not exists logo_url text;
