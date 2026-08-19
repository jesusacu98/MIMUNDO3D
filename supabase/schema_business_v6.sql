-- =========================================================
-- MIMUNDO3D — Nuevo estatus de pedido "Impreso"
-- Pegar y ejecutar en el SQL Editor de Supabase.
-- Seguro de re-correr: busca el check constraint de order_status (sin
-- importar cómo se llame) y lo reemplaza por la versión actualizada.
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
  check (order_status in ('Pendiente Cotizar', 'Pendiente Imprimir', 'Imprimiendo', 'Impreso', 'Entregado', 'Cancelado'));
