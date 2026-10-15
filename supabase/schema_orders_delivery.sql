-- Fecha de entrega de los pedidos (correr a mano en el SQL Editor de Supabase).
alter table public.orders add column if not exists delivery_date date;
