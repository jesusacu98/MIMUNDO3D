-- Descripción del producto para el cliente (la que sale en la nota/PDF del pedido). La columna
-- `product_name` ("Descripción" en el formulario) queda como nota interna del admin.
-- Correr a mano en el SQL Editor de Supabase, ANTES de subir el código a producción.
alter table public.order_items add column if not exists client_description text;
