-- =========================================================
-- MIMUNDO3D — Migración de datos históricos (MiMundo3D.xlsx)
-- Pegar y ejecutar en el SQL Editor de Supabase DESPUÉS de schema_business.sql.
-- Origen: hojas "Pedidos" (30 registros) e "Inversión" (25 registros).
-- =========================================================

insert into public.orders
  (order_date, client_name, product_name, sale_price, cost, payment_status, payment_method, order_status, makerworld_link)
values
  ('2026-06-04', 'Emilio', 'Caja estampas personalizada', 120.0, 40.0, 'Pagado', 'Efectivo Jesus', 'Entregado', NULL),
  ('2026-06-05', 'Cantera', 'Caja estampas', 100.0, 40.0, 'Pagado', 'Efectivo Jesus', 'Entregado', NULL),
  ('2026-06-05', 'Maydel', 'Caja estampas personalizada', 120.0, 40.0, 'Pagado', 'Efectivo Jesus', 'Entregado', NULL),
  ('2026-06-07', 'Regina', 'Caja estampas personalizada', 120.0, 40.0, 'Pagado', 'Transferencia Jesus', 'Entregado', NULL),
  ('2026-06-08', 'Adriana', 'Caja estampas', 100.0, 40.0, 'Pagado', 'Transferencia Adriana', 'Entregado', NULL),
  ('2026-06-13', 'Christian', 'Porta Album mundial personalizado', 220.0, 100.0, 'Pagado', 'Transferencia Jesus', 'Entregado', NULL),
  ('2026-06-13', 'Christian', 'Porta Lata Copa Mundial', 280.0, 76.03, 'Pagado', 'Transferencia Jesus', 'Entregado', 'https://makerworld.com/es/models/2754622'),
  ('2026-06-09', 'Maye', 'Proyecto universitario', 750.0, 354.0, 'Pagado', 'Transferencia Jesus', 'Entregado', NULL),
  (NULL, 'Adriel', 'Porta Album mundial personalizado', 220.0, 100.0, 'Pagado', 'Transferencia Jesus', 'Entregado', NULL),
  (NULL, 'Hector', 'Porta Album mundial personalizado', 200.0, 100.0, 'Pagado', 'Transferencia Adriana', 'Entregado', NULL),
  (NULL, 'Jose', 'Llavero Personalizado Moto, Logan, Nombre', 100.0, 20.0, 'Pagado', 'Efectivo Jesus', 'Entregado', NULL),
  (NULL, 'Aby', 'Moldes para figuras de Yeso', 150.0, 40.0, 'Pagado', 'Transferencia Jesus', 'Entregado', NULL),
  (NULL, 'Adriana', 'Caja estampas personalizada (LALO) AZUL', 120.0, 40.0, 'Pagado', 'Transferencia Adriana', 'Entregado', NULL),
  (NULL, 'Adriana', 'Caja estampas personalizada (ADAN) AZUL', 120.0, 40.0, 'Pagado', 'Transferencia Adriana', 'Entregado', NULL),
  (NULL, 'Adriana', 'Caja estampas negro-blanco-naranja', 100.0, 40.0, 'Pagado', 'Transferencia Adriana', 'Entregado', NULL),
  (NULL, 'Cecilia', '27 llaveros graduacion con nombre', 270.0, 92.07, 'Pagado', 'Transferencia Jesus', 'Entregado', NULL),
  (NULL, 'Cecilia', '6 medallas', 180.0, 20.0, 'Pagado', 'Transferencia Jesus', 'Entregado', NULL),
  (NULL, 'Cecilia compañero', '26 llaveros graduacion con nombre', 338.0, 88.66, 'Pagado', 'Transferencia Jesus', 'Entregado', NULL),
  ('2026-06-12', 'Mayer', 'Proyecto universitario', 150.0, 40.0, 'Pagado', 'Efectivo Cajita', 'Entregado', NULL),
  ('2026-06-13', 'Michelle', 'Copa mundial', 250.0, 50.0, 'Pagado', 'Transferencia Adriana', 'Entregado', NULL),
  (NULL, 'Hector', 'Porta Album mundial', 300.0, 100.0, 'Pagado', 'Transferencia Adriana', 'Entregado', NULL),
  (NULL, 'J.Paul', 'Caja estampas verde-negro (J.PAUL)', 150.0, 40.0, 'Pagado', 'Efectivo Cajita', 'Entregado', NULL),
  (NULL, 'Adriana', 'Letrero letra Alexander', 200.0, NULL, NULL, NULL, 'Entregado', NULL),
  (NULL, 'Christian', 'Maceta quetzaltcoalt', NULL, 536.0, NULL, NULL, 'Cancelado', NULL),
  (NULL, 'Cecilia', 'Llavero personalizado maestra karen', 100.0, 50.0, 'Pagado', 'Transferencia Adriana', 'Entregado', NULL),
  (NULL, 'Karla', 'Imanes refri', 975.0, 130.0, 'Pagado', 'Transferencia Jesus', 'Entregado', NULL),
  (NULL, 'Fernanda', 'Letra Luciana Rana Renne', NULL, NULL, NULL, NULL, 'Imprimiendo', NULL),
  (NULL, 'Chuy', 'Cuadro Camisa Basket Jordan', 350.0, 100.0, 'Pagado', 'Transferencia Adriana', 'Entregado', NULL),
  (NULL, 'Juan', 'Cuadro redes sociales', 350.0, 100.0, 'Pagado', 'Efectivo Adriana', 'Entregado', NULL),
  (NULL, 'Cecilia', 'Porta numeros', NULL, NULL, NULL, NULL, 'Pendiente Cotizar', NULL);

insert into public.investments
  (expense_date, description, cost, paid_by)
values
  ('2026-05-31', 'Impresora bambu lab A1', 7980.99, 'Adriana'),
  ('2026-05-31', 'Filamentos 8 colores', 2296.0, 'Adriana'),
  ('2026-06-08', 'Filamentos 4 colores', 1116.0, 'Jesus'),
  ('2026-06-13', 'Compra de dominio', 204.0, 'Jesus'),
  ('2026-06-13', 'Caja', 470.0, 'Jesus'),
  ('2026-06-13', 'Pegamento', 80.0, 'Jesus'),
  ('2026-06-08', 'Tornillos', 50.0, 'Jesus'),
  ('2026-06-16', 'Filamento, NFC, y kolaloka', 795.0, 'Jesus'),
  ('2026-06-30', 'Mechero para flamear', 75.0, 'Jesus'),
  (NULL, 'Liston', 25.0, 'Jesus'),
  (NULL, 'Imanes', 30.0, 'Jesus'),
  (NULL, 'Broches llaveros y pinzas Centro', 300.0, 'Jesus'),
  (NULL, 'Broches llaveros', 220.0, 'Adriana'),
  (NULL, 'Broches llaveros SHEIN', 260.0, 'Adriana'),
  (NULL, 'Pompones para llavero', 249.0, 'Adriana'),
  (NULL, 'Liston Curli', 40.0, 'Adriana'),
  (NULL, 'Papeleria', 14.0, 'Jesus'),
  (NULL, 'Papeleria', 10.0, 'Adriana'),
  ('2026-06-30', 'Filamento gris 2kg', 536.0, 'Jesus'),
  (NULL, 'Broches llaveros', 274.0, 'Adriana'),
  (NULL, 'Resina', 296.0, 'Adriana'),
  (NULL, 'Filamentos', 894.0, 'Adriana'),
  (NULL, 'Comoda almacenamiento', 1460.0, 'Adriana'),
  (NULL, 'Lapices y plumas', 90.0, 'Jesus'),
  ('2026-08-11', 'Publicidad llaveros y letreros 3D', 294.0, 'Jesus');
