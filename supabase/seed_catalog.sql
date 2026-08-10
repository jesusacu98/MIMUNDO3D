-- =========================================================
-- MIMUNDO3D — Seed del catálogo actual (categorías, colores, productos)
-- Ejecutar después de schema_catalog.sql
-- =========================================================

insert into public.product_categories (name, display_order) values
  ('Llaveros', 1),
  ('Imanes', 2),
  ('Eventos', 3),
  ('Negocios y Marcas', 4),
  ('Escolares', 5),
  ('Decoración', 6)
on conflict (name) do nothing;

insert into public.product_colors (name, hex_code, display_order) values
  ('Rosa', '#ff5371', 1),
  ('Amarillo', '#f2ca00', 2),
  ('Azul', '#003f85', 3),
  ('Rojo', '#bb0c17', 4),
  ('Naranja', '#ff8f4c', 5),
  ('Verde', '#219659', 6),
  ('Dorado', '#c9a227', 7),
  ('Blanco', '#ffffff', 8),
  ('Negro', '#18181b', 9),
  ('Piel', '#e8b796', 10),
  ('Gris', '#9ca3af', 11),
  ('Verde Metálico', '#4d7c5f', 12)
on conflict (name) do nothing;

insert into public.products (
  category_id, name, description, price, is_starting_price, image_url,
  is_personalizable, has_business_info, has_character_option, display_order
)
select c.id, v.name, v.description, v.price, v.is_starting_price, v.image_url,
       v.is_personalizable, v.has_business_info, v.has_character_option, v.display_order
from (values
  -- category_name, name, description, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option, display_order
  ('Llaveros', 'Nombre + Pompón', 'Llavero impreso en 3D con tu nombre grabado, pompón de peluche y dije colgante. Disponible en varios colores.', 100.00, true, '/catalogo/1.jpg', true, false, false, 1),
  ('Llaveros', 'Nombre + Mascota + Hobby', 'Combo de dijes 3D personalizados: tu nombre, tu mascota y tu hobby favorito, unidos en un solo llavero.', 100.00, true, '/catalogo/2.jpg', true, false, true, 2),
  ('Llaveros', 'Nombre + Personaje', 'Llavero con la silueta de tu personaje, mascota o diseño favorito, personalizado con el nombre que quieras.', 100.00, true, '/catalogo/3.jpg', true, false, true, 3),
  ('Llaveros', 'Graduación', 'El regalo perfecto para celebrar la graduación: nombre y año grabados en un birrete impreso en 3D.', 25.00, true, '/catalogo/4.jpg', true, false, false, 4),
  ('Imanes', 'Imán de Graduación', 'El regalo perfecto para celebrar la graduación: nombre y año grabados en un imán impreso en 3D para el refri.', 25.00, true, '/catalogo/5.jpg', true, false, false, 5),
  ('Eventos', 'Letras 3D con Nombre + Personaje', 'Nombre en 3D y tu personaje favorito. Perfectas para decorar un cuarto o como centro de mesa en fiestas.', 200.00, true, '/catalogo/6.jpg', true, false, true, 6),
  ('Eventos', 'Letras 3D con Nombre', 'Nombre en 3D y tu personaje personalizado. Ideal para cumpleaños, baby shower o decoración de eventos.', 200.00, true, '/catalogo/7.jpg', true, false, true, 7),
  ('Negocios y Marcas', 'Display Redes Sociales + QR + NFC', 'Expositor personalizado con tus redes sociales, código QR y chip NFC integrado, para que tus clientes te encuentren con sólo acercar el celular.', 350.00, true, '/catalogo/8.jpg', false, true, false, 8),
  ('Negocios y Marcas', 'Display Redes Sociales + QR + NFC', 'El mismo expositor, adaptado a los colores, logo y redes sociales de tu negocio.', 350.00, true, '/catalogo/9.jpg', false, true, false, 9),
  ('Escolares', 'Medalla de Alumno Sobresaliente', 'Medalla dorada personalizada con el nombre del alumno y su grupo, ideal para reconocimientos y clausuras escolares.', 40.00, true, '/catalogo/10.jpg', true, false, false, 10),
  ('Decoración', 'Cuadro de tu Jugador Favorito', 'Cuadro decorativo con la playera de tu jugador favorito personalizada con tu nombre, enmarcada y lista para colgar.', 350.00, true, '/catalogo/11.jpg', true, false, true, 11),
  ('Decoración', 'Cuadro de tu Jugador Favorito', 'El mismo cuadro, con la playera y el jugador que tú elijas, personalizado con tu nombre.', 350.00, true, '/catalogo/12.jpg', true, false, true, 12),
  ('Escolares', 'Lápiz Jumbo Pluma', 'Pluma en forma de lápiz gigante, ideal para la escuela, oficina o de regalo. Elige tu color favorito.', 35.00, true, '/catalogo/13.jpg', false, false, false, 13),
  ('Escolares', 'Crayón Pluma Mediano', 'Pluma en forma de crayón tamaño mediano, perfecta para la mochila o el estuche. Elige tu color favorito.', 35.00, true, '/catalogo/14.jpg', false, false, false, 14),
  ('Escolares', 'Crayón Pluma Jumbo', 'Pluma en forma de crayón tamaño jumbo, súper llamativa. Elige tu color favorito.', 40.00, true, '/catalogo/15.jpg', false, false, false, 15),
  ('Escolares', 'Porta Lápiz con Nombre', 'Adorno personalizado que se coloca en la punta del lápiz con el nombre que quieras, en el color que elijas.', 10.00, true, '/catalogo/16.jpg', true, false, false, 16),
  ('Escolares', 'Porta Lápiz con Nombre', 'Adorno personalizado que se coloca en la punta del lápiz con el nombre que quieras, en el color que elijas.', 10.00, true, '/catalogo/17.jpg', true, false, false, 17),
  ('Escolares', 'Porta Lápiz con Nombre', 'Adorno personalizado que se coloca en la punta del lápiz con el nombre que quieras, en el color que elijas.', 10.00, true, '/catalogo/18.jpg', true, false, false, 18),
  ('Escolares', 'Kit de Regreso a Clases', 'Incluye 5 lápices jumbo, 2 crayones pluma medianos y 1 crayón pluma jumbo, más 10 porta lápices personalizados con el nombre que quieras.', 300.00, true, '/catalogo/19.jpg', true, false, false, 19),
  ('Escolares', 'Tag para Mochila', 'Tag personalizado para tu mochila con tu nombre completo y un personaje o ilustración a tu gusto, con anillo para colgar.', 150.00, true, '/catalogo/20.png', true, false, true, 20)
) as v(category_name, name, description, price, is_starting_price, image_url, is_personalizable, has_business_info, has_character_option, display_order)
join public.product_categories c on c.name = v.category_name;
