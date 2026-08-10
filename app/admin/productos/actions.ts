'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database } from '@/lib/database.types';

type ProductInsert = Database['public']['Tables']['products']['Insert'];

function parseProductForm(formData: FormData): { values: ProductInsert } | { error: string } {
  const name = String(formData.get('name') || '').trim();
  const categoryId = String(formData.get('category_id') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const imageUrl = String(formData.get('image_url') || '').trim();
  const priceRaw = String(formData.get('price') || '').trim();
  const price = Number(priceRaw);
  const displayOrderRaw = String(formData.get('display_order') || '').trim();
  const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;

  if (!name || !categoryId || !description || !imageUrl) {
    return { error: 'Completa nombre, categoría, descripción y ruta de imagen.' };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: 'El precio debe ser un número válido mayor o igual a 0.' };
  }
  if (!Number.isFinite(displayOrder)) {
    return { error: 'El orden debe ser un número válido.' };
  }

  return {
    values: {
      name,
      category_id: categoryId,
      description,
      image_url: imageUrl,
      price,
      display_order: displayOrder,
      is_starting_price: formData.get('is_starting_price') === 'on',
      is_personalizable: formData.get('is_personalizable') === 'on',
      has_business_info: formData.get('has_business_info') === 'on',
      has_character_option: formData.get('has_character_option') === 'on',
      is_active: formData.get('is_active') === 'on',
    },
  };
}

export async function createProduct(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseProductForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/productos/nuevo?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabaseAdmin.from('products').insert(parsed.values);

  if (error) {
    redirect(`/admin/productos/nuevo?error=${encodeURIComponent('No se pudo crear el producto: ' + error.message)}`);
  }

  revalidatePath('/catalogo');
  revalidatePath('/admin/productos');
  redirect('/admin/productos');
}

export async function updateProduct(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseProductForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/productos/${id}/editar?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabaseAdmin.from('products').update(parsed.values).eq('id', id);

  if (error) {
    redirect(`/admin/productos/${id}/editar?error=${encodeURIComponent('No se pudo guardar el producto: ' + error.message)}`);
  }

  revalidatePath('/catalogo');
  revalidatePath('/admin/productos');
  redirect('/admin/productos');
}
