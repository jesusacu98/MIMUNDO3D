import nodemailer from 'nodemailer';
import { getNotifySettings } from './settings';

// Aviso por correo al dueño del negocio cuando falla una llamada real a IA (chat de ideas o
// generador de diseños), vía SMTP (nodemailer) con el correo que ya usa el negocio — sin depender
// de una cuenta nueva en un tercero. La configuración (host, puerto, usuario, contraseña de
// aplicación y el correo que recibe el aviso) vive en Supabase y se edita desde
// /admin/notificaciones (ver lib/notify/settings.ts) — no en variables de entorno.

// Como mucho un aviso por origen cada 10 minutos: si el proveedor de IA cae, pueden fallar muchos
// mensajes seguidos y no tiene sentido inundar el correo con uno por cada uno.
const COOLDOWN_MS = 10 * 60 * 1000;
const lastSentAt = new Map<string, number>();

function withinCooldown(key: string): boolean {
  const last = lastSentAt.get(key);
  return last !== undefined && Date.now() - last < COOLDOWN_MS;
}

export type AiErrorOrigin = 'ideas' | 'disenos';

const ORIGIN_LABEL: Record<AiErrorOrigin, string> = {
  ideas: 'el chat de ideas (/ideas)',
  disenos: 'el generador de diseños (/admin/disenos)',
};

/**
 * Manda el aviso; nunca lanza. Si falta configuración, si ya se avisó hace poco del mismo origen,
 * o si el envío mismo falla, sólo se registra en consola — llamar sin `await` desde el catch de
 * cada origen.
 */
export async function notifyAiError(origin: AiErrorOrigin, error: unknown): Promise<void> {
  const settings = await getNotifySettings();
  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPass || !settings.alertEmail) {
    console.warn(`[notify] Configuración de correo incompleta (ver /admin/notificaciones) — no se avisó del error en ${origin}.`);
    return;
  }
  if (withinCooldown(origin)) return;
  lastSentAt.set(origin, Date.now());

  const detail = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
  const subject = `⚠️ MIMUNDO3D: error de IA en ${origin === 'ideas' ? 'el chat de ideas' : 'el generador de diseños'}`;
  const text = `Falló una llamada a IA en ${ORIGIN_LABEL[origin]}.\n\n${detail}`;

  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    });
    await transporter.sendMail({ from: settings.smtpUser, to: settings.alertEmail, subject, text });
  } catch (err) {
    console.error('[notify] No se pudo avisar por correo:', err);
  }
}
