-- Vincula una variante de una generación del historial de diseños (/admin/disenos) con un pedido:
-- la que eligió el cliente. `order_variant` es el índice (desde 0) del boceto dentro de image_urls.
-- Correr a mano en el SQL Editor de Supabase. Seguro de re-correr.
-- Si se borra el pedido, el diseño queda en el historial sin vínculo.
alter table public.design_history
  add column if not exists order_id uuid references public.orders (id) on delete set null;

alter table public.design_history
  add column if not exists order_variant integer;

create index if not exists design_history_order_id_idx on public.design_history (order_id);
