'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadCategoryImage, deleteCategoryImageIfManaged } from '@/lib/storage';
import type { Database } from '@/lib/database.types';

interface CategoryValues {
  name: string;
  display_order: number;
  slug: string;
  description: string | null;
  headline: string | null;
  show_on_home: boolean;
}

// Enlace de la página pública a partir del nombre: sin acentos, minúsculas, con guiones.
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCategoryForm(formData: FormData): CategoryValues | { error: string } {
  const name = String(formData.get('name') || '').trim();
  const displayOrderRaw = String(formData.get('display_order') || '').trim();
  const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;
  const slug = slugify(String(formData.get('slug') || '').trim() || name);
  const description = String(formData.get('description') || '').trim();
  const headline = String(formData.get('headline') || '').trim();

  if (!name) {
    return { error: 'Escribe un nombre para la categoría.' };
  }
  if (!Number.isFinite(displayOrder)) {
    return { error: 'El orden debe ser un número válido.' };
  }
  if (!slug) {
    return { error: 'El enlace de la categoría necesita al menos una letra o un número.' };
  }

  return {
    name,
    display_order: displayOrder,
    slug,
    description: description || null,
    headline: headline || null,
    show_on_home: formData.get('show_on_home') === 'on',
  };
}

function saveErrorMessage(error: { code?: string; message: string }, parsed: CategoryValues, verb: 'crear' | 'guardar'): string {
  if (error.code === '23505') {
    return error.message.includes('slug')
      ? `Ya hay otra categoría con el enlace "${parsed.slug}". Cambia el enlace.`
      : `Ya existe una categoría llamada "${parsed.name}".`;
  }
  if (error.code === '42703') {
    return 'Falta actualizar la base de datos: corre supabase/schema_catalog_v8.sql en el SQL Editor de Supabase.';
  }
  return `No se pudo ${verb} la categoría: ${error.message}`;
}

function getFile(formData: FormData, key: string): File | null {
  const file = formData.get(key);
  return file instanceof File && file.size > 0 ? file : null;
}

// Todo lo público que depende de las categorías: el inicio, las páginas de categoría y el catálogo.
function revalidateCategoryPages() {
  revalidatePath('/');
  revalidatePath('/catalogo');
  revalidatePath('/categorias/[categoria]', 'page');
  revalidatePath('/admin/categorias');
}

export async function createCategory(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseCategoryForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/categorias/nueva?error=${encodeURIComponent(parsed.error)}`);
  }

  let imageUrl: string | null = null;
  const imageFile = getFile(formData, 'image_file');
  if (imageFile) {
    const uploaded = await uploadCategoryImage(imageFile);
    if ('error' in uploaded) redirect(`/admin/categorias/nueva?error=${encodeURIComponent(uploaded.error)}`);
    imageUrl = uploaded.url;
  }

  const row: Database['public']['Tables']['product_categories']['Insert'] = { ...parsed, home_image_url: imageUrl };
  const { error } = await supabaseAdmin.from('product_categories').insert(row);

  if (error) {
    await deleteCategoryImageIfManaged(imageUrl);
    redirect(`/admin/categorias/nueva?error=${encodeURIComponent(saveErrorMessage(error, parsed, 'crear'))}`);
  }

  revalidateCategoryPages();
  redirect('/admin/categorias');
}

export async function updateCategory(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseCategoryForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/categorias/${id}/editar?error=${encodeURIComponent(parsed.error)}`);
  }

  const update: CategoryValues & { home_image_url?: string | null } = { ...parsed };
  const imageFile = getFile(formData, 'image_file');
  const removeImage = formData.get('remove_image') === 'on';

  // Sólo se toca la imagen si se eligió una nueva o se pidió quitarla.
  let previousImageUrl: string | null = null;
  let newImageUrl: string | null = null;
  if (imageFile || removeImage) {
    const { data: existing } = await supabaseAdmin.from('product_categories').select('home_image_url').eq('id', id).maybeSingle();
    previousImageUrl = existing?.home_image_url ?? null;

    if (imageFile) {
      const uploaded = await uploadCategoryImage(imageFile);
      if ('error' in uploaded) redirect(`/admin/categorias/${id}/editar?error=${encodeURIComponent(uploaded.error)}`);
      newImageUrl = uploaded.url;
      update.home_image_url = newImageUrl;
    } else {
      update.home_image_url = null;
    }
  }

  const { error } = await supabaseAdmin.from('product_categories').update(update).eq('id', id);

  if (error) {
    await deleteCategoryImageIfManaged(newImageUrl);
    redirect(`/admin/categorias/${id}/editar?error=${encodeURIComponent(saveErrorMessage(error, parsed, 'guardar'))}`);
  }

  await deleteCategoryImageIfManaged(previousImageUrl);

  revalidateCategoryPages();
  redirect('/admin/categorias');
}

export async function deleteCategory(id: string, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const { data: existing } = await supabaseAdmin.from('product_categories').select('home_image_url').eq('id', id).maybeSingle();

  const { error } = await supabaseAdmin.from('product_categories').delete().eq('id', id);

  if (error) {
    const message =
      error.code === '23503'
        ? 'No se puede borrar: hay productos usando esta categoría. Reasígnalos o bórralos primero.'
        : 'No se pudo borrar la categoría: ' + error.message;
    redirect(`/admin/categorias?error=${encodeURIComponent(message)}`);
  }

  await deleteCategoryImageIfManaged(existing?.home_image_url);
  revalidateCategoryPages();
  redirect('/admin/categorias');
}

/** Muestra u oculta una categoría en "Explora por categoría" del inicio, sin abrir el formulario. */
export async function setCategoryOnHome(id: string, show: boolean, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const { error } = await supabaseAdmin.from('product_categories').update({ show_on_home: show }).eq('id', id);

  if (error) {
    const message =
      error.code === '42703'
        ? 'Falta actualizar la base de datos: corre supabase/schema_catalog_v8.sql en el SQL Editor de Supabase.'
        : 'No se pudo cambiar la visibilidad: ' + error.message;
    redirect(`/admin/categorias?error=${encodeURIComponent(message)}`);
  }

  revalidateCategoryPages();
  redirect('/admin/categorias');
}
