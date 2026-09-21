-- =========================================================
-- MIMUNDO3D — Registra en public.banners la portada de Negocios que ya está
-- subida a mano en el bucket imagenes_sitio (raíz): "Banner de productos para Negocios.png".
-- Correr DESPUÉS de schema_catalog_v7.sql. Seguro de re-correr (no duplica).
-- Aparece como la imagen de "Negocios" en "Explora por categoría" del inicio.
-- (Ya se insertó en su momento; se conserva como referencia.)
-- =========================================================

with new_banner as (
  insert into public.banners (title, image_url, display_order, is_active)
  select
    'Banner de productos para Negocios',
    'https://ffxdmtjueqkfxizsjhbp.supabase.co/storage/v1/object/public/imagenes_sitio/Banner%20de%20productos%20para%20Negocios.png',
    1,
    true
  where not exists (
    select 1 from public.banners
    where image_url like '%/imagenes_sitio/Banner%20de%20productos%20para%20Negocios.png'
  )
  returning id
)
insert into public.banner_placements (banner_id, placement, category_id)
select id, 'home_category', (select id from public.product_categories where name = 'Negocios')
from new_banner
where exists (select 1 from public.product_categories where name = 'Negocios');
