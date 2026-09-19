'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function parseSubcategoryForm(formData: FormData): { category_id: string; name: string; display_order: number } | { error: string } {
  const categoryId = String(formData.get('category_id') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const displayOrderRaw = String(formData.get('display_order') || '').trim();
  const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;

  if (!categoryId) {
    return { error: 'Selecciona la categoría a la que pertenece.' };
  }
  if (!name) {
    return { error: 'Escribe un nombre para la subcategoría.' };
  }
  if (!Number.isFinite(displayOrder)) {
    return { error: 'El orden debe ser un número válido.' };
  }

  return { category_id: categoryId, name, display_order: displayOrder };
}

function refresh() {
  revalidatePath('/admin/subcategorias');
  revalidatePath('/admin/productos');
  revalidatePath('/categorias/[categoria]', 'page');
}

export async function createSubcategory(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseSubcategoryForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/subcategorias/nueva?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabaseAdmin.from('product_subcategories').insert(parsed);

  if (error) {
    const message =
      error.code === '23505'
        ? `Ya existe una subcategoría llamada "${parsed.name}" en esa categoría.`
        : 'No se pudo crear la subcategoría: ' + error.message;
    redirect(`/admin/subcategorias/nueva?error=${encodeURIComponent(message)}`);
  }

  refresh();
  redirect('/admin/subcategorias');
}

export async function updateSubcategory(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseSubcategoryForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/subcategorias/${id}/editar?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabaseAdmin.from('product_subcategories').update(parsed).eq('id', id);

  if (error) {
    const message =
      error.code === '23505'
        ? `Ya existe una subcategoría llamada "${parsed.name}" en esa categoría.`
        : 'No se pudo guardar la subcategoría: ' + error.message;
    redirect(`/admin/subcategorias/${id}/editar?error=${encodeURIComponent(message)}`);
  }

  // Si se movió a otra categoría, los productos de la categoría anterior dejan de pertenecerle.
  await supabaseAdmin.from('products').update({ subcategory_id: null }).eq('subcategory_id', id).neq('category_id', parsed.category_id);

  refresh();
  redirect('/admin/subcategorias');
}

export async function deleteSubcategory(id: string, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  // products.subcategory_id es "on delete set null": los productos quedan sin subcategoría.
  const { error } = await supabaseAdmin.from('product_subcategories').delete().eq('id', id);

  if (error) {
    redirect(`/admin/subcategorias?error=${encodeURIComponent('No se pudo borrar la subcategoría: ' + error.message)}`);
  }

  refresh();
  redirect('/admin/subcategorias');
}
