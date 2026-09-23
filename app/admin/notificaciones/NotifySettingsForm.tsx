'use client';

import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';
import type { NotifySettingsView } from '@/lib/notify/settings';

interface NotifySettingsFormProps {
  settings: NotifySettingsView;
  saveAction: (formData: FormData) => void | Promise<void>;
  clearPassAction: () => void | Promise<void>;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';
const helpClass = 'mt-1.5 text-xs text-zinc-500';

export default function NotifySettingsForm({ settings, saveAction, clearPassAction }: NotifySettingsFormProps) {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="space-y-6">
      <form action={saveAction} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <label htmlFor="alert_email" className={labelClass}>
            Correo que recibe los avisos
          </label>
          <input
            id="alert_email"
            name="alert_email"
            type="email"
            defaultValue={settings.alertEmail ?? ''}
            placeholder="tu@correo.com"
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="smtp_host" className={labelClass}>
              Servidor SMTP
            </label>
            <input
              id="smtp_host"
              name="smtp_host"
              type="text"
              defaultValue={settings.smtpHost ?? ''}
              placeholder="smtp.gmail.com"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="smtp_port" className={labelClass}>
              Puerto
            </label>
            <input
              id="smtp_port"
              name="smtp_port"
              type="number"
              min={1}
              step={1}
              defaultValue={settings.smtpPort ?? 587}
              required
              className={inputClass}
            />
          </div>
        </div>
        <p className={`${helpClass} -mt-4`}>587 es lo más común (STARTTLS); 465 si tu proveedor pide conexión segura directa.</p>

        <div>
          <label htmlFor="smtp_user" className={labelClass}>
            Correo que manda el aviso (usuario SMTP)
          </label>
          <input
            id="smtp_user"
            name="smtp_user"
            type="email"
            defaultValue={settings.smtpUser ?? ''}
            placeholder="tu@correo.com"
            required
            className={inputClass}
          />
          <p className={helpClass}>El correo desde el que se manda — puede ser el mismo que el que lo recibe.</p>
        </div>

        <div>
          <label htmlFor="smtp_pass" className={labelClass}>
            Contraseña de aplicación
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <input
              id="smtp_pass"
              name="smtp_pass"
              type={showPass ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              placeholder={settings.hasSmtpPass ? 'Dejar en blanco para no cambiarla' : 'contraseña de aplicación, no la normal'}
              className={`${inputClass} mt-0 flex-1`}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? 'Ocultar' : 'Mostrar'}
              className="shrink-0 px-3 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className={`${helpClass} inline-flex items-center gap-1.5`}>
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            {settings.hasSmtpPass
              ? 'Configurada.'
              : 'No configurada: el aviso por correo no se manda, sólo queda en el log del servidor.'}
          </p>
          <p className={helpClass}>
            En Gmail no es tu contraseña normal: se genera desde Cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de
            aplicaciones.
          </p>
        </div>

        <SubmitButton className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer">
          Guardar cambios
        </SubmitButton>
      </form>

      {settings.hasSmtpPass && (
        <form
          action={clearPassAction}
          onSubmit={(e) => {
            if (!confirm('¿Quitar la contraseña SMTP? El aviso ante errores de IA dejará de mandarse hasta que configures una nueva.')) {
              e.preventDefault();
            }
          }}
          className="bg-white border border-zinc-200/60 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4"
        >
          <p className="text-sm text-zinc-600">¿Ya no quieres recibir el aviso por correo? Quita la contraseña guardada.</p>
          <SubmitButton className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm transition-all cursor-pointer">
            Quitar contraseña configurada
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
