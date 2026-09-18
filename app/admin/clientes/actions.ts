'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { uploadClientLogo, deleteClientLogoIfManaged } from '@/lib/storage';
import { SOCIAL_NETWORKS, normalizeSocialUrl } from '@/lib/socialNetworks';

interface BankFields {
  bank_name: string;
  account_holder_name: string;
  card_number: string | null;
  interbank_clabe: string | null;
}

interface ParsedClient {
  name: string;
  brand_color: string | null;
  whatsapp_number: string | null;
  // null = el cliente no tiene datos bancarios (sección NFC sin cuenta).
  bank: BankFields | null;
  socialToSave: { network: string; url: string }[];
  socialToDelete: string[];
}

type ParseResult = { values: ParsedClient } | { error: string; tab: 'nfc' | 'redes' };

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function parseClientForm(formData: FormData): ParseResult {
  const name = String(formData.get('name') || '').trim();
  const brandColorRaw = String(formData.get('brand_color') || '').trim();
  const whatsappRaw = String(formData.get('whatsapp_number') || '').replace(/\D/g, '');
  const bankName = String(formData.get('bank_name') || '').trim();
  const accountHolderName = String(formData.get('account_holder_name') || '').trim();
  const cardNumberRaw = String(formData.get('card_number') || '').replace(/\s+/g, '');
  const clabeRaw = String(formData.get('interbank_clabe') || '').replace(/\s+/g, '');

  if (!name) return { error: 'Escribe el nombre del cliente o negocio.', tab: 'nfc' };
  if (brandColorRaw && !HEX_COLOR_RE.test(brandColorRaw)) {
    return { error: 'El color de marca debe ser un hexadecimal válido, ej. #2563EB.', tab: 'nfc' };
  }
  if (whatsappRaw && !/^\d{10,15}$/.test(whatsappRaw)) {
    return { error: 'El WhatsApp debe tener solo dígitos (10 a 15).', tab: 'nfc' };
  }

  // Los datos bancarios son opcionales como bloque: vacío = sin cuenta; si se
  // captura algo, se exigen los mismos campos de siempre.
  let bank: BankFields | null = null;
  if (bankName || accountHolderName || cardNumberRaw || clabeRaw) {
    if (!bankName) return { error: 'Escribe el nombre del banco.', tab: 'nfc' };
    if (!accountHolderName) return { error: 'Escribe el nombre del titular de la cuenta.', tab: 'nfc' };
    if (!clabeRaw && !cardNumberRaw) {
      return { error: 'Captura al menos la CLABE interbancaria o el número de cuenta/tarjeta.', tab: 'nfc' };
    }
    if (clabeRaw && !/^\d{18}$/.test(clabeRaw)) {
      return { error: 'La CLABE debe tener 18 dígitos numéricos.', tab: 'nfc' };
    }
    if (cardNumberRaw && !/^\d{10,19}$/.test(cardNumberRaw)) {
      return { error: 'El número de cuenta/tarjeta debe contener solo dígitos (10 a 19).', tab: 'nfc' };
    }
    bank = {
      bank_name: bankName,
      account_holder_name: accountHolderName,
      card_number: cardNumberRaw || null,
      interbank_clabe: clabeRaw || null,
    };
  }

  const socialToSave: { network: string; url: string }[] = [];
  const socialToDelete: string[] = [];
  for (const network of SOCIAL_NETWORKS) {
    const raw = String(formData.get(`url_${network.key}`) || '').trim();
    if (!raw) {
      socialToDelete.push(network.key);
      continue;
    }
    const result = normalizeSocialUrl(network, raw);
    if ('error' in result) return { error: result.error, tab: 'redes' };
    socialToSave.push({ network: network.key, url: result.url });
  }

  return {
    values: {
      name,
      brand_color: brandColorRaw ? brandColorRaw.toUpperCase() : null,
      whatsapp_number: whatsappRaw || null,
      bank,
      socialToSave,
      socialToDelete,
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

function errorUrl(base: string, message: string, tab: 'nfc' | 'redes' = 'nfc') {
  return `${base}?error=${encodeURIComponent(message)}&tab=${tab}`;
}

export async function createClient(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const base = '/admin/clientes/nuevo';

  const parsed = parseClientForm(formData);
  if ('error' in parsed) {
    redirect(errorUrl(base, parsed.error, parsed.tab));
    return;
  }

  const logoResult = await resolveLogoUrl(formData, null);
  if ('error' in logoResult) {
    redirect(errorUrl(base, logoResult.error));
    return;
  }

  const { name, brand_color, whatsapp_number, bank, socialToSave } = parsed.values;

  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .insert({ name, brand_color, whatsapp_number, logo_url: logoResult.url })
    .select('id')
    .single();

  if (clientError || !client) {
    await deleteClientLogoIfManaged(logoResult.url);
    redirect(errorUrl(base, 'No se pudo crear el cliente: ' + (clientError?.message ?? '')));
    return;
  }

  const rollback = async () => {
    await supabaseAdmin.from('client_bank_accounts').delete().eq('client_id', client.id);
    await supabaseAdmin.from('clients').delete().eq('id', client.id);
    await deleteClientLogoIfManaged(logoResult.url);
  };

  if (bank) {
    const { error: bankError } = await supabaseAdmin.from('client_bank_accounts').insert({ client_id: client.id, ...bank });
    if (bankError) {
      await rollback();
      redirect(errorUrl(base, 'No se pudieron guardar los datos bancarios: ' + bankError.message));
      return;
    }
  }

  if (socialToSave.length > 0) {
    const { error: socialError } = await supabaseAdmin
      .from('client_social_links')
      .insert(socialToSave.map((s) => ({ client_id: client.id, ...s })));
    if (socialError) {
      await rollback();
      redirect(errorUrl(base, 'No se pudieron guardar las redes: ' + socialError.message, 'redes'));
      return;
    }
  }

  revalidatePath('/admin/clientes');
  redirect('/admin/clientes');
}

export async function updateClient(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const base = `/admin/clientes/${id}/editar`;

  const parsed = parseClientForm(formData);
  if ('error' in parsed) {
    redirect(errorUrl(base, parsed.error, parsed.tab));
    return;
  }

  const currentLogoUrl = String(formData.get('current_logo_url') || '').trim() || null;
  const logoResult = await resolveLogoUrl(formData, currentLogoUrl);
  if ('error' in logoResult) {
    redirect(errorUrl(base, logoResult.error));
    return;
  }

  const { name, brand_color, whatsapp_number, bank, socialToSave, socialToDelete } = parsed.values;
  const clientId = Number(id);

  const { error: clientError } = await supabaseAdmin
    .from('clients')
    .update({ name, brand_color, whatsapp_number, logo_url: logoResult.url })
    .eq('id', clientId);

  if (clientError) {
    if (logoResult.url !== currentLogoUrl) await deleteClientLogoIfManaged(logoResult.url);
    redirect(errorUrl(base, 'No se pudo guardar el cliente: ' + clientError.message));
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

  let bankError: { message: string } | null = null;
  if (bank) {
    ({ error: bankError } = existingAccount
      ? await supabaseAdmin.from('client_bank_accounts').update(bank).eq('id', existingAccount.id)
      : await supabaseAdmin.from('client_bank_accounts').insert({ client_id: clientId, ...bank }));
  } else if (existingAccount) {
    ({ error: bankError } = await supabaseAdmin.from('client_bank_accounts').delete().eq('client_id', clientId));
  }

  if (bankError) {
    redirect(errorUrl(base, 'No se pudieron guardar los datos bancarios: ' + bankError.message));
    return;
  }

  if (socialToSave.length > 0) {
    const { error } = await supabaseAdmin
      .from('client_social_links')
      .upsert(socialToSave.map((s) => ({ client_id: clientId, ...s })), { onConflict: 'client_id,network' });
    if (error) {
      redirect(errorUrl(base, 'No se pudieron guardar las redes: ' + error.message, 'redes'));
      return;
    }
  }

  if (socialToDelete.length > 0) {
    const { error } = await supabaseAdmin
      .from('client_social_links')
      .delete()
      .eq('client_id', clientId)
      .in('network', socialToDelete);
    if (error) {
      redirect(errorUrl(base, 'No se pudieron quitar las redes vacías: ' + error.message, 'redes'));
      return;
    }
  }

  revalidatePath('/admin/clientes');
  redirect('/admin/clientes');
}

export async function deleteClient(id: string, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const clientId = Number(id);

  const { data: clientRow } = await supabaseAdmin.from('clients').select('logo_url').eq('id', clientId).maybeSingle();

  await supabaseAdmin.from('client_bank_accounts').delete().eq('client_id', clientId);

  const { error } = await supabaseAdmin.from('clients').delete().eq('id', clientId);

  if (error) {
    redirect(`/admin/clientes?error=${encodeURIComponent('No se pudo borrar el cliente: ' + error.message)}`);
    return;
  }

  await deleteClientLogoIfManaged(clientRow?.logo_url);

  revalidatePath('/admin/clientes');
  redirect('/admin/clientes');
}
