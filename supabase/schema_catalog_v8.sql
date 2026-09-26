-- =========================================================
-- MIMUNDO3D — Categorías del inicio administrables (product_categories)
-- Pegar y ejecutar en el SQL Editor de Supabase DESPUÉS de schema_catalog_v7.sql.
-- Seguro de re-correr. Antes las categorías con página propia (/categorias/[slug]) y las que
-- salían en "Explora por categoría" del inicio estaban fijas en el código (lib/homeCategories.ts);
-- ahora viven en la tabla y se administran desde /admin/categorias.
--   slug:         enlace de la página de la categoría (/categorias/<slug>), único.
--   description:  texto que va debajo del título en esa página.
--   headline:     título llamativo opcional (si falta se usa el nombre).
--   show_on_home: si aparece en "Explora por categoría" del inicio.
--   home_image_url: imagen de su recuadro en el inicio (se sube desde /admin/categorias; si falta,
--                 se usan los banners con ubicación "Inicio · imagen de categoría").
-- =========================================================

alter table public.product_categories
  add column if not exists slug text,
  add column if not exists description text,
  add column if not exists headline text,
  add column if not exists show_on_home boolean not null default false,
  add column if not exists home_image_url text;

create unique index if not exists product_categories_slug_key
  on public.product_categories (slug) where slug is not null;

-- Las tres que ya estaban en el código.
update public.product_categories
set slug = 'negocios',
    headline = 'Todo para tu negocio, personalizado',
    description = 'Diseñamos e imprimimos en 3D las piezas que hacen que tu negocio se vea profesional y se recuerde: todo con tu marca, tus colores y tus redes sociales.',
    show_on_home = true
where name = 'Negocios' and slug is null;

update public.product_categories
set slug = 'llaveros',
    description = 'Llaveros personalizados con tu nombre, logo o personaje favorito.',
    show_on_home = true
where name = 'Llaveros' and slug is null;

update public.product_categories
set slug = 'hogar',
    description = 'Piezas y organizadores para darle un toque único a tu espacio.',
    show_on_home = true
where name = 'Hogar' and slug is null;

-- Escolares pasa a mostrarse en el inicio.
update public.product_categories
set slug = 'escolares',
    headline = 'Todo para el regreso a clases',
    description = 'Plumas con forma de lápiz y crayón, porta lápices con nombre, tags para mochila y más: todo personalizado para que cada útil sea único.',
    show_on_home = true
where name = 'Escolares' and slug is null;

-- Cualquier otra categoría existente: slug a partir del nombre (sin acentos, con guiones).
update public.product_categories
set slug = trim(both '-' from regexp_replace(lower(translate(name, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')), '[^a-z0-9]+', '-', 'g'))
where slug is null;
