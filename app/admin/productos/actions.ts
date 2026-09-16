'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadCatalogImage, deleteCatalogImageIfManaged } from '@/lib/storage';
import type { Database } from '@/lib/database.types';

type ProductInsert = Database['public']['Tables']['products']['Insert'];

async function resolveImageUrl(formData: FormData): Promise<{ url: string } | { error: string }> {
  const file = formData.get('image_file');
  if (file instanceof File && file.size > 0) {
    return uploadCatalogImage(file);
  }

  const pathValue = String(formData.get('image_url') || '').trim();
  if (!pathValue) {
    return { error: 'Selecciona una imagen para subir o escribe una ruta.' };
  }
  return { url: pathValue };
}

async function parseProductForm(formData: FormData): Promise<{ values: ProductInsert } | { error: string }> {
  const name = String(formData.get('name') || '').trim();
  const categoryId = String(formData.get('category_id') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const priceRaw = String(formData.get('price') || '').trim();
  const price = Number(priceRaw);
  const costRaw = String(formData.get('cost') || '').trim();
  const cost = costRaw ? Number(costRaw) : null;
  const displayOrderRaw = String(formData.get('display_order') || '').trim();
  const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;

  if (!name || !categoryId || !description) {
    return { error: 'Completa nombre, categoría y descripción.' };
  }
  if (!Number.isFinite(price) || price < 0) {
    return { error: 'El precio debe ser un número válido mayor o igual a 0.' };
  }
  if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
    return { error: 'El costo de fabricación debe ser un número válido mayor o igual a 0.' };
  }
  if (!Number.isFinite(displayOrder)) {
    return { error: 'El orden debe ser un número válido.' };
  }

  const imageResult = await resolveImageUrl(formData);
  if ('error' in imageResult) {
    return { error: imageResult.error };
  }

  return {
    values: {
      name,
      category_id: categoryId,
      description,
      image_url: imageResult.url,
      price,
      cost,
      display_order: displayOrder,
      is_starting_price: formData.get('is_starting_price') === 'on',
      is_personalizable: formData.get('is_personalizable') === 'on',
      has_business_info: formData.get('has_business_info') === 'on',
      has_character_option: formData.get('has_character_option') === 'on',
      is_active: formData.get('is_active') === 'on',
    },
  };
}

// Un mismo archivo de Storage puede seguir usándose como portada de otro
// producto o como otra imagen adicional — sólo se borra del bucket si ya
// no queda ninguna referencia a esa URL en la base.
async function isImageUrlStillReferenced(url: string): Promise<boolean> {
  const [{ count: productCount }, { count: imageCount }] = await Promise.all([
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('image_url', url),
    supabaseAdmin.from('product_images').select('id', { count: 'exact', head: true }).eq('image_url', url),
  ]);
  return (productCount ?? 0) > 0 || (imageCount ?? 0) > 0;
}

async function syncProductImages(productId: string, formData: FormData) {
  const removeIds = formData.getAll('remove_image_ids').map(String).filter(Boolean);
  if (removeIds.length > 0) {
    const { data: toRemove } = await supabaseAdmin.from('product_images').select('id, image_url').in('id', removeIds);
    await supabaseAdmin.from('product_images').delete().in('id', removeIds);
    for (const img of toRemove ?? []) {
      if (!(await isImageUrlStillReferenced(img.image_url))) {
        await deleteCatalogImageIfManaged(img.image_url);
      }
    }
  }

  const files = formData.getAll('extra_image_files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 0) {
    const { data: existing } = await supabaseAdmin
      .from('product_images')
      .select('display_order')
      .eq('product_id', productId)
      .order('display_order', { ascending: false })
      .limit(1);

    let nextOrder = (existing?.[0]?.display_order ?? -1) + 1;
    const rows: Database['public']['Tables']['product_images']['Insert'][] = [];
    for (const file of files) {
      const result = await uploadCatalogImage(file);
      if ('error' in result) continue;
      rows.push({ product_id: productId, image_url: result.url, display_order: nextOrder });
      nextOrder += 1;
    }
    if (rows.length > 0) {
      await supabaseAdmin.from('product_images').insert(rows);
    }
  }
}

export async function createProduct(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = await parseProductForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/productos/nuevo?error=${encodeURIComponent(parsed.error)}`);
  }

  const { data: created, error } = await supabaseAdmin.from('products').insert(parsed.values).select('id').single();

  if (error || !created) {
    redirect(`/admin/productos/nuevo?error=${encodeURIComponent('No se pudo crear el producto: ' + (error?.message ?? ''))}`);
  }

  await syncProductImages(created.id, formData);

  revalidatePath('/catalogo');
  revalidatePath('/admin/productos');
  redirect('/admin/productos');
}

export async function updateProduct(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = await parseProductForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/productos/${id}/editar?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabaseAdmin.from('products').update(parsed.values).eq('id', id);

  if (error) {
    redirect(`/admin/productos/${id}/editar?error=${encodeURIComponent('No se pudo guardar el producto: ' + error.message)}`);
  }

  const previousImageUrl = String(formData.get('current_image_url') || '');
  if (previousImageUrl && previousImageUrl !== parsed.values.image_url) {
    if (!(await isImageUrlStillReferenced(previousImageUrl))) {
      await deleteCatalogImageIfManaged(previousImageUrl);
    }
  }

  await syncProductImages(id, formData);

  revalidatePath('/catalogo');
  revalidatePath('/admin/productos');
  redirect('/admin/productos');
}
