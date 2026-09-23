'use server';

import { redirect } from 'next/navigation';
import { isCurrentUserAdmin } from '@/lib/auth';
import { setSmtpPass, updateNotifySettings } from '@/lib/notify/settings';

const PATH = '/admin/notificaciones';

interface SettingsFormValues {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  alertEmail: string;
  smtpPass: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseSettingsForm(formData: FormData): { values: SettingsFormValues } | { error: string } {
  const smtpHost = String(formData.get('smtp_host') || '').trim();
  const smtpUser = String(formData.get('smtp_user') || '').trim();
  const alertEmail = String(formData.get('alert_email') || '').trim();

  const portRaw = String(formData.get('smtp_port') || '');
  const smtpPort = Number(portRaw);
  if (!Number.isFinite(smtpPort) || !Number.isInteger(smtpPort) || smtpPort <= 0) {
    return { error: 'El puerto SMTP debe ser un número entero mayor a 0 (587 o 465 son los más comunes).' };
  }

  if (smtpUser && !EMAIL_PATTERN.test(smtpUser)) {
    return { error: 'El usuario SMTP debe ser un correo válido.' };
  }
  if (alertEmail && !EMAIL_PATTERN.test(alertEmail)) {
    return { error: 'El correo que recibe los avisos debe ser un correo válido.' };
  }

  return {
    values: { smtpHost, smtpPort, smtpUser, alertEmail, smtpPass: String(formData.get('smtp_pass') || '').trim() },
  };
}

/** Guarda host, puerto, usuario y correo de aviso. Si "smtp_pass" viene vacío, la contraseña guardada NO se toca. */
export async function saveNotifySettings(formData: FormData) {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  const parsed = parseSettingsForm(formData);
  if ('error' in parsed) {
    redirect(`${PATH}?error=${encodeURIComponent(parsed.error)}`);
  }

  try {
    await updateNotifySettings({
      smtpHost: parsed.values.smtpHost,
      smtpPort: parsed.values.smtpPort,
      smtpUser: parsed.values.smtpUser,
      alertEmail: parsed.values.alertEmail,
    });
    if (parsed.values.smtpPass) await setSmtpPass(parsed.values.smtpPass);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    redirect(`${PATH}?error=${encodeURIComponent('No se pudo guardar: ' + message)}`);
  }

  redirect(`${PATH}?ok=1`);
}

/** Quita la contraseña SMTP guardada — el aviso deja de intentar mandarse hasta que se configure una nueva. */
export async function clearSmtpPass() {
  if (!(await isCurrentUserAdmin())) redirect('/admin/login');

  try {
    await setSmtpPass(null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    redirect(`${PATH}?error=${encodeURIComponent('No se pudo quitar la contraseña: ' + message)}`);
  }

  redirect(`${PATH}?ok=1`);
}
