'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Database } from '@/lib/database.types';

type InvestmentInsert = Database['public']['Tables']['investments']['Insert'];

function parseInvestmentForm(formData: FormData): { values: InvestmentInsert } | { error: string } {
  const description = String(formData.get('description') || '').trim();
  const paidBy = String(formData.get('paid_by') || '').trim();
  const expenseDateRaw = String(formData.get('expense_date') || '').trim();
  const costRaw = String(formData.get('cost') || '').trim();
  const cost = Number(costRaw);

  if (!description || !paidBy) {
    return { error: 'Completa concepto y quién compró.' };
  }
  if (!Number.isFinite(cost) || cost < 0) {
    return { error: 'El costo debe ser un número válido mayor o igual a 0.' };
  }

  return {
    values: {
      expense_date: expenseDateRaw || null,
      description,
      cost,
      paid_by: paidBy,
    },
  };
}

export async function createInvestment(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseInvestmentForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/inversion/nuevo?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabaseAdmin.from('investments').insert(parsed.values);

  if (error) {
    redirect(`/admin/inversion/nuevo?error=${encodeURIComponent('No se pudo crear el gasto: ' + error.message)}`);
  }

  revalidatePath('/admin/inversion');
  revalidatePath('/admin');
  redirect('/admin/inversion');
}

export async function updateInvestment(id: string, formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseInvestmentForm(formData);
  if ('error' in parsed) {
    redirect(`/admin/inversion/${id}/editar?error=${encodeURIComponent(parsed.error)}`);
  }

  const { error } = await supabaseAdmin.from('investments').update(parsed.values).eq('id', id);

  if (error) {
    redirect(`/admin/inversion/${id}/editar?error=${encodeURIComponent('No se pudo guardar el gasto: ' + error.message)}`);
  }

  revalidatePath('/admin/inversion');
  revalidatePath('/admin');
  redirect('/admin/inversion');
}

export async function deleteInvestment(id: string, _formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const { error } = await supabaseAdmin.from('investments').delete().eq('id', id);

  if (error) {
    redirect(`/admin/inversion?error=${encodeURIComponent('No se pudo borrar el gasto: ' + error.message)}`);
  }

  revalidatePath('/admin/inversion');
  revalidatePath('/admin');
  redirect('/admin/inversion');
}
