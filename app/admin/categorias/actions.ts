'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function parseCategoryForm(formData: FormData): { name: string; display_order: number } | { error: string } {
  const name = String(formData.get('name') || '').trim();
  const displayOrderRaw = String(formData.get('display_order') || '').trim();
  const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;

  if (!name) {
    return { error: 'Escribe un nombre para la categoría.' };
  }
  if (!Number.isFinite(displayOrder)) {
    return { error: 'El orden debe ser un número válido.' };
  }

  return { name, display_order: displayOrder };
}

export async function createCategory(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseCategoryForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/categorias/nueva?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabaseAdmin.from('product_categories').insert(parsed);

  if (error) {
    const message =
      error.code === '23505' ? `Ya existe una categoría llamada "${parsed.name}".` : 'No se pudo crear la categoría: ' + error.message;
    redirect(`/admin/categorias/nueva?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/catalogo');
  revalidatePath('/admin/categorias');
  redirect('/admin/categorias');
}

export async function updateCategory(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseCategoryForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/categorias/${id}/editar?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabaseAdmin.from('product_categories').update(parsed).eq('id', id);

  if (error) {
    const message =
      error.code === '23505' ? `Ya existe una categoría llamada "${parsed.name}".` : 'No se pudo guardar la categoría: ' + error.message;
    redirect(`/admin/categorias/${id}/editar?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/catalogo');
  revalidatePath('/admin/categorias');
  redirect('/admin/categorias');
}

export async function deleteCategory(id: string, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const { error } = await supabaseAdmin.from('product_categories').delete().eq('id', id);

  if (error) {
    const message =
      error.code === '23503'
        ? 'No se puede borrar: hay productos usando esta categoría. Reasígnalos o bórralos primero.'
        : 'No se pudo borrar la categoría: ' + error.message;
    redirect(`/admin/categorias?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/catalogo');
  revalidatePath('/admin/categorias');
  redirect('/admin/categorias');
}
