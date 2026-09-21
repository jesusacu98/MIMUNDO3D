'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadBannerImage, deleteBannerImageIfManaged } from '@/lib/storage';
import { parsePlacementKey, placementKey } from '@/lib/banners';
import type { Database } from '@/lib/database.types';

type BannerInsert = Database['public']['Tables']['banners']['Insert'];
type PlacementInsert = Database['public']['Tables']['banner_placements']['Insert'];

interface ParsedBanner {
  values: Omit<BannerInsert, 'image_url'>;
  // Secciones donde se muestra, como claves "placement" o "placement:categoryId".
  placementKeys: string[];
}

function parseBannerForm(formData: FormData): ParsedBanner | { error: string } {
  const title = String(formData.get('title') || '').trim();
  const linkRaw = String(formData.get('link_url') || '').trim();
  const displayOrderRaw = String(formData.get('display_order') || '').trim();
  const displayOrder = displayOrderRaw ? Number(displayOrderRaw) : 0;

  if (!title) return { error: 'Escribe un nombre para el banner.' };
  if (!Number.isFinite(displayOrder)) return { error: 'El orden debe ser un número válido.' };

  const placementKeys = [...new Set(formData.getAll('placements').map(String))];
  if (placementKeys.length === 0) return { error: 'Elige al menos una sección donde se mostrará el banner.' };
  if (placementKeys.some((key) => !parsePlacementKey(key))) return { error: 'Alguna de las secciones elegidas no es válida.' };

  // Sólo rutas internas ("/catalogo") o https://; evita javascript:, // (protocol-relative), etc.
  if (linkRaw && !(linkRaw.startsWith('/') && !linkRaw.startsWith('//')) && !/^https?:\/\//i.test(linkRaw)) {
    return { error: 'El enlace debe empezar con "/" (ej. /catalogo) o con https://.' };
  }

  return {
    values: {
      title,
      link_url: linkRaw || null,
      display_order: displayOrder,
      is_active: formData.get('is_active') === 'on',
    },
    placementKeys,
  };
}

function toPlacementRows(bannerId: string, keys: string[]): PlacementInsert[] {
  return keys.flatMap((key) => {
    const parsed = parsePlacementKey(key);
    return parsed ? [{ banner_id: bannerId, placement: parsed.placement, category_id: parsed.categoryId }] : [];
  });
}

// Deja en la BD exactamente las secciones elegidas: borra las que se quitaron y agrega las nuevas.
async function syncPlacements(bannerId: string, keys: string[]): Promise<string | null> {
  const { data: existing, error: loadError } = await supabaseAdmin
    .from('banner_placements')
    .select('id, placement, category_id')
    .eq('banner_id', bannerId);
  if (loadError) return loadError.message;

  const wanted = new Set(keys);
  const current = new Set<string>();
  const staleIds: string[] = [];
  for (const row of existing ?? []) {
    const key = placementKey(row.placement, row.category_id);
    if (wanted.has(key)) current.add(key);
    else staleIds.push(row.id);
  }

  if (staleIds.length > 0) {
    const { error } = await supabaseAdmin.from('banner_placements').delete().in('id', staleIds);
    if (error) return error.message;
  }

  const toAdd = toPlacementRows(bannerId, keys.filter((key) => !current.has(key)));
  if (toAdd.length > 0) {
    const { error } = await supabaseAdmin.from('banner_placements').insert(toAdd);
    if (error) return error.message;
  }
  return null;
}

function getFile(formData: FormData, key: string): File | null {
  const file = formData.get(key);
  return file instanceof File && file.size > 0 ? file : null;
}

function refresh() {
  revalidatePath('/');
  revalidatePath('/catalogo');
  revalidatePath('/categorias/[categoria]', 'page');
  revalidatePath('/admin/banners');
}

export async function createBanner(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseBannerForm(formData);
  if ('error' in parsed) redirect(`/admin/banners/nueva?error=${encodeURIComponent(parsed.error)}`);

  const desktopFile = getFile(formData, 'image_file');
  if (!desktopFile) redirect(`/admin/banners/nueva?error=${encodeURIComponent('Sube la imagen del banner.')}`);

  const desktop = await uploadBannerImage(desktopFile);
  if ('error' in desktop) redirect(`/admin/banners/nueva?error=${encodeURIComponent(desktop.error)}`);

  let mobileUrl: string | null = null;
  const mobileFile = getFile(formData, 'mobile_image_file');
  if (mobileFile) {
    const mobile = await uploadBannerImage(mobileFile);
    if ('error' in mobile) {
      await deleteBannerImageIfManaged(desktop.url);
      redirect(`/admin/banners/nueva?error=${encodeURIComponent(mobile.error)}`);
    }
    mobileUrl = mobile.url;
  }

  const { data: created, error } = await supabaseAdmin
    .from('banners')
    .insert({ ...parsed.values, image_url: desktop.url, mobile_image_url: mobileUrl })
    .select('id')
    .single();

  if (error || !created) {
    await deleteBannerImageIfManaged(desktop.url);
    await deleteBannerImageIfManaged(mobileUrl);
    redirect(`/admin/banners/nueva?error=${encodeURIComponent('No se pudo crear el banner: ' + (error?.message ?? ''))}`);
  }

  const placementsError = await syncPlacements(created.id, parsed.placementKeys);
  if (placementsError) {
    // El banner sin secciones no serviría de nada: se deshace todo (las ubicaciones caen por cascade).
    await supabaseAdmin.from('banners').delete().eq('id', created.id);
    await deleteBannerImageIfManaged(desktop.url);
    await deleteBannerImageIfManaged(mobileUrl);
    redirect(`/admin/banners/nueva?error=${encodeURIComponent('No se pudieron guardar las secciones: ' + placementsError)}`);
  }

  refresh();
  redirect('/admin/banners');
}

export async function updateBanner(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const editUrl = `/admin/banners/${id}/editar`;
  const parsed = parseBannerForm(formData);
  if ('error' in parsed) redirect(`${editUrl}?error=${encodeURIComponent(parsed.error)}`);

  const { data: existing } = await supabaseAdmin.from('banners').select('image_url, mobile_image_url').eq('id', id).maybeSingle();
  if (!existing) redirect(`/admin/banners?error=${encodeURIComponent('El banner ya no existe.')}`);

  const update: Database['public']['Tables']['banners']['Update'] = { ...parsed.values };
  const uploaded: string[] = [];
  const toDelete: (string | null)[] = [];

  const desktopFile = getFile(formData, 'image_file');
  if (desktopFile) {
    const result = await uploadBannerImage(desktopFile);
    if ('error' in result) redirect(`${editUrl}?error=${encodeURIComponent(result.error)}`);
    update.image_url = result.url;
    uploaded.push(result.url);
    toDelete.push(existing.image_url);
  }

  const mobileFile = getFile(formData, 'mobile_image_file');
  if (mobileFile) {
    const result = await uploadBannerImage(mobileFile);
    if ('error' in result) {
      for (const url of uploaded) await deleteBannerImageIfManaged(url);
      redirect(`${editUrl}?error=${encodeURIComponent(result.error)}`);
    }
    update.mobile_image_url = result.url;
    uploaded.push(result.url);
    toDelete.push(existing.mobile_image_url);
  } else if (formData.get('remove_mobile_image') === 'on') {
    update.mobile_image_url = null;
    toDelete.push(existing.mobile_image_url);
  }

  const { error } = await supabaseAdmin.from('banners').update(update).eq('id', id);

  if (error) {
    for (const url of uploaded) await deleteBannerImageIfManaged(url);
    redirect(`${editUrl}?error=${encodeURIComponent('No se pudo guardar el banner: ' + error.message)}`);
  }

  const placementsError = await syncPlacements(id, parsed.placementKeys);
  if (placementsError) {
    redirect(`${editUrl}?error=${encodeURIComponent('Se guardó el banner, pero no las secciones: ' + placementsError)}`);
  }

  for (const url of toDelete) await deleteBannerImageIfManaged(url);

  refresh();
  redirect('/admin/banners');
}

export async function toggleBannerActive(id: string, isActive: boolean, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const { error } = await supabaseAdmin.from('banners').update({ is_active: isActive }).eq('id', id);
  if (error) {
    redirect(`/admin/banners?error=${encodeURIComponent('No se pudo cambiar el estado: ' + error.message)}`);
  }

  refresh();
  redirect('/admin/banners');
}

export async function deleteBanner(id: string, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const { data: existing } = await supabaseAdmin.from('banners').select('image_url, mobile_image_url').eq('id', id).maybeSingle();

  const { error } = await supabaseAdmin.from('banners').delete().eq('id', id);
  if (error) {
    redirect(`/admin/banners?error=${encodeURIComponent('No se pudo borrar el banner: ' + error.message)}`);
  }

  await deleteBannerImageIfManaged(existing?.image_url);
  await deleteBannerImageIfManaged(existing?.mobile_image_url);

  refresh();
  redirect('/admin/banners');
}
