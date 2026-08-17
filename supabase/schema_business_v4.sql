-- =========================================================
-- MIMUNDO3D — Nuevos estatus de pedido/pago
-- Pegar y ejecutar en el SQL Editor de Supabase.
-- Agrega "Anticipo" a payment_status y "Pendiente Imprimir" a order_status.
-- Seguro de re-correr: busca el check constraint existente en cada columna
-- (sin importar cómo se llame) y lo reemplaza por la versión actualizada.
-- =========================================================

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%order_status%'
  loop
    execute format('alter table public.orders drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.orders add constraint orders_order_status_check
  check (order_status in ('Pendiente Cotizar', 'Pendiente Imprimir', 'Imprimiendo', 'Entregado', 'Cancelado'));

do $$
declare
  con record;
begin
  for con in
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%payment_status%'
  loop
    execute format('alter table public.orders drop constraint %I', con.conname);
  end loop;
end $$;

alter table public.orders add constraint orders_payment_status_check
  check (payment_status is null or payment_status in ('Pagado', 'Anticipo', 'Pendiente'));
