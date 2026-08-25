'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadClientLogo, deleteClientLogoIfManaged } from '@/lib/storage';

interface ParsedNfcClient {
  name: string;
  brand_color: string | null;
  bank_name: string;
  account_holder_name: string;
  card_number: string | null;
  interbank_clabe: string | null;
}

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function parseNfcClientForm(formData: FormData): { values: ParsedNfcClient } | { error: string } {
  const name = String(formData.get('name') || '').trim();
  const brandColorRaw = String(formData.get('brand_color') || '').trim();
  const bankName = String(formData.get('bank_name') || '').trim();
  const accountHolderName = String(formData.get('account_holder_name') || '').trim();
  const cardNumberRaw = String(formData.get('card_number') || '').replace(/\s+/g, '');
  const clabeRaw = String(formData.get('interbank_clabe') || '').replace(/\s+/g, '');

  if (!name) return { error: 'Escribe el nombre del cliente o negocio.' };
  if (brandColorRaw && !HEX_COLOR_RE.test(brandColorRaw)) {
    return { error: 'El color de marca debe ser un hexadecimal válido, ej. #2563EB.' };
  }
  if (!bankName) return { error: 'Escribe el nombre del banco.' };
  if (!accountHolderName) return { error: 'Escribe el nombre del titular de la cuenta.' };
  if (!clabeRaw && !cardNumberRaw) {
    return { error: 'Captura al menos la CLABE interbancaria o el número de cuenta/tarjeta.' };
  }
  if (clabeRaw && !/^\d{18}$/.test(clabeRaw)) {
    return { error: 'La CLABE debe tener 18 dígitos numéricos.' };
  }
  if (cardNumberRaw && !/^\d{10,19}$/.test(cardNumberRaw)) {
    return { error: 'El número de cuenta/tarjeta debe contener solo dígitos (10 a 19).' };
  }

  return {
    values: {
      name,
      brand_color: brandColorRaw ? brandColorRaw.toUpperCase() : null,
      bank_name: bankName,
      account_holder_name: accountHolderName,
      card_number: cardNumberRaw || null,
      interbank_clabe: clabeRaw || null,
    },
  };
}

// El logo es opcional: si suben un archivo nuevo se sube y reemplaza; si marcan
// "quitar logo" se limpia; si no, se conserva el que ya tenía (currentUrl).
async function resolveLogoUrl(formData: FormData, currentUrl: string | null): Promise<{ url: string | null } | { error: string }> {
  const file = formData.get('logo_file');
  if (file instanceof File && file.size > 0) {
    return uploadClientLogo(file);
  }
  if (formData.get('remove_logo') === 'on') {
    return { url: null };
  }
  return { url: currentUrl };
}

export async function createNfcClient(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseNfcClientForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/clientes-nfc/nuevo?error=${encodeURIComponent(parsed.error)}`);
    return;
  }

  const logoResult = await resolveLogoUrl(formData, null);
  if ('error' in logoResult) {
    redirect(`/admin/clientes-nfc/nuevo?error=${encodeURIComponent(logoResult.error)}`);
    return;
  }

  const { name, brand_color, ...bankFields } = parsed.values;

  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .insert({ name, brand_color, logo_url: logoResult.url })
    .select('id')
    .single();

  if (clientError || !client) {
    await deleteClientLogoIfManaged(logoResult.url);
    redirect(`/admin/clientes-nfc/nuevo?error=${encodeURIComponent('No se pudo crear el cliente: ' + (clientError?.message ?? ''))}`);
    return;
  }

  const { error: bankError } = await supabaseAdmin
    .from('client_bank_accounts')
    .insert({ client_id: client.id, ...bankFields });

  if (bankError) {
    await supabaseAdmin.from('clients').delete().eq('id', client.id);
    await deleteClientLogoIfManaged(logoResult.url);
    redirect(`/admin/clientes-nfc/nuevo?error=${encodeURIComponent('No se pudieron guardar los datos bancarios: ' + bankError.message)}`);
    return;
  }

  revalidatePath('/admin/clientes-nfc');
  redirect('/admin/clientes-nfc');
}

export async function updateNfcClient(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseNfcClientForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/clientes-nfc/${id}/editar?error=${encodeURIComponent(parsed.error)}`);
    return;
  }

  const currentLogoUrl = String(formData.get('current_logo_url') || '').trim() || null;
  const logoResult = await resolveLogoUrl(formData, currentLogoUrl);
  if ('error' in logoResult) {
    redirect(`/admin/clientes-nfc/${id}/editar?error=${encodeURIComponent(logoResult.error)}`);
    return;
  }

  const { name, brand_color, ...bankFields } = parsed.values;
  const clientId = Number(id);

  const { error: clientError } = await supabaseAdmin
    .from('clients')
    .update({ name, brand_color, logo_url: logoResult.url })
    .eq('id', clientId);

  if (clientError) {
    if (logoResult.url !== currentLogoUrl) await deleteClientLogoIfManaged(logoResult.url);
    redirect(`/admin/clientes-nfc/${id}/editar?error=${encodeURIComponent('No se pudo guardar el cliente: ' + clientError.message)}`);
    return;
  }

  if (currentLogoUrl && currentLogoUrl !== logoResult.url) {
    await deleteClientLogoIfManaged(currentLogoUrl);
  }

  const { data: existingAccount } = await supabaseAdmin
    .from('client_bank_accounts')
    .select('id')
    .eq('client_id', clientId)
    .limit(1)
    .maybeSingle();

  const { error: bankError } = existingAccount
    ? await supabaseAdmin.from('client_bank_accounts').update(bankFields).eq('id', existingAccount.id)
    : await supabaseAdmin.from('client_bank_accounts').insert({ client_id: clientId, ...bankFields });

  if (bankError) {
    redirect(`/admin/clientes-nfc/${id}/editar?error=${encodeURIComponent('No se pudieron guardar los datos bancarios: ' + bankError.message)}`);
    return;
  }

  revalidatePath('/admin/clientes-nfc');
  redirect('/admin/clientes-nfc');
}

export async function deleteNfcClient(id: string, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const clientId = Number(id);

  const { data: clientRow } = await supabaseAdmin.from('clients').select('logo_url').eq('id', clientId).maybeSingle();

  await supabaseAdmin.from('client_bank_accounts').delete().eq('client_id', clientId);

  const { error } = await supabaseAdmin.from('clients').delete().eq('id', clientId);

  if (error) {
    redirect(`/admin/clientes-nfc?error=${encodeURIComponent('No se pudo borrar el cliente: ' + error.message)}`);
    return;
  }

  await deleteClientLogoIfManaged(clientRow?.logo_url);

  revalidatePath('/admin/clientes-nfc');
  redirect('/admin/clientes-nfc');
}
