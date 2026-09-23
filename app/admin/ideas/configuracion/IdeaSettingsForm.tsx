'use client';

import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import SubmitButton from '@/components/SubmitButton';
import type { IdeaSettingsView } from '@/lib/ideas/settings';
import { MODELS_BY_PROVIDER } from '@/lib/ideas/llm/models';

interface IdeaSettingsFormProps {
  settings: IdeaSettingsView;
  saveAction: (formData: FormData) => void | Promise<void>;
  clearKeyAction: () => void | Promise<void>;
}

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';
const helpClass = 'mt-1.5 text-xs text-zinc-500';

const CUSTOM_MODEL = '__custom__';

export default function IdeaSettingsForm({ settings, saveAction, clearKeyAction }: IdeaSettingsFormProps) {
  const [showKey, setShowKey] = useState(false);
  // `provider` maneja qué lista de modelos mostrar (mock no usa modelo); no depende del valor
  // guardado en BD hasta que el usuario guarda de nuevo, es sólo para la UI del selector.
  const [provider, setProvider] = useState<'auto' | 'mock' | 'openai'>(settings.provider);
  const models = provider === 'mock' ? [] : MODELS_BY_PROVIDER.openai;
  const knownModel = models.some((m) => m.id === settings.model);
  const [modelChoice, setModelChoice] = useState(knownModel ? settings.model : CUSTOM_MODEL);
  const [customModel, setCustomModel] = useState(knownModel ? '' : settings.model);
  const selectedDescription = models.find((m) => m.id === modelChoice)?.description;

  return (
    <div className="space-y-6">
      <form action={saveAction} className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Llave de OpenAI */}
        <div>
          <label htmlFor="api_key" className={labelClass}>
            Llave de OpenAI (OPENAI_API_KEY)
          </label>
          <div className="mt-2 flex items-stretch gap-2">
            <input
              id="api_key"
              name="api_key"
              type={showKey ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              placeholder={settings.hasApiKey ? 'Dejar en blanco para no cambiarla' : 'sk-...'}
              className={`${inputClass} mt-0 flex-1`}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              aria-label={showKey ? 'Ocultar' : 'Mostrar'}
              className="shrink-0 px-3 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className={`${helpClass} inline-flex items-center gap-1.5`}>
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            {settings.hasApiKey ? (
              <>
                Configurada, termina en <span className="font-mono">...{settings.apiKeyPreview}</span>. También la usa el generador de
                diseños en /admin/disenos.
              </>
            ) : (
              'No configurada: el chat responde en modo demostración (gratis, sin llamar a OpenAI) y el generador de diseños no funciona.'
            )}
          </p>
        </div>

        <div>
          <label htmlFor="provider" className={labelClass}>
            Proveedor
          </label>
          <select
            id="provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'auto' | 'mock' | 'openai')}
            className={inputClass}
          >
            <option value="auto">Automático (usa OpenAI si hay llave, si no la simulación)</option>
            <option value="openai">Forzar OpenAI</option>
            <option value="mock">Forzar simulación (modo demostración)</option>
          </select>
          <p className={helpClass}>Deja &quot;Automático&quot; salvo que quieras forzar uno de los dos a propósito.</p>
        </div>

        <div>
          <label htmlFor="model" className={labelClass}>
            Modelo
          </label>

          {provider === 'mock' ? (
            <>
              <input type="hidden" name="model" value={modelChoice === CUSTOM_MODEL ? customModel : modelChoice} />
              <p className="mt-2 px-4 py-2.5 bg-zinc-100 border border-zinc-200 rounded-xl text-sm text-zinc-400">
                El modo simulación no llama a ningún modelo.
              </p>
            </>
          ) : (
            <>
              <select
                id="model"
                value={modelChoice}
                onChange={(e) => setModelChoice(e.target.value)}
                className={inputClass}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
                <option value={CUSTOM_MODEL}>Otro (escribir el nombre)...</option>
              </select>

              {modelChoice === CUSTOM_MODEL ? (
                <input
                  name="model"
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="nombre exacto del modelo en tu cuenta de OpenAI"
                  className={`${inputClass} mt-2`}
                  required
                />
              ) : (
                <input type="hidden" name="model" value={modelChoice} />
              )}

              <p className={helpClass}>
                {modelChoice === CUSTOM_MODEL
                  ? 'Revisá en tu cuenta de OpenAI el nombre exacto del modelo que querés usar.'
                  : selectedDescription}
              </p>
            </>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="use_catalog"
            defaultChecked={settings.useCatalog}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary cursor-pointer"
          />
          <span className="text-sm text-zinc-700">
            La IA consulta el catálogo real para enlazar productos existentes
            <span className="block text-xs text-zinc-500 mt-0.5">Si lo desmarcas, sugiere ideas libres sin tocar la base de datos.</span>
          </span>
        </label>

        <div className="border-t border-zinc-100 pt-6">
          <p className={`${labelClass} mb-4`}>Límites de uso</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="rate_limit_per_hour" className="text-xs font-medium text-zinc-600">
                Mensajes / visitante / hora
              </label>
              <input
                id="rate_limit_per_hour"
                name="rate_limit_per_hour"
                type="number"
                min={1}
                step={1}
                defaultValue={settings.rateLimitPerHour}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="global_rate_limit_per_hour" className="text-xs font-medium text-zinc-600">
                Techo global / hora
              </label>
              <input
                id="global_rate_limit_per_hour"
                name="global_rate_limit_per_hour"
                type="number"
                min={1}
                step={1}
                defaultValue={settings.globalRateLimitPerHour}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="global_rate_limit_per_day" className="text-xs font-medium text-zinc-600">
                Techo global / día
              </label>
              <input
                id="global_rate_limit_per_day"
                name="global_rate_limit_per_day"
                type="number"
                min={1}
                step={1}
                defaultValue={settings.globalRateLimitPerDay}
                required
                className={inputClass}
              />
            </div>
          </div>
          <p className={helpClass}>
            El techo global cuenta a todos los visitantes juntos: si se alcanza, el chat sigue respondiendo pero con la simulación,
            hasta que baje la demanda.
          </p>
        </div>

        <SubmitButton className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer">
          Guardar cambios
        </SubmitButton>
      </form>

      {settings.hasApiKey && (
        <form
          action={clearKeyAction}
          onSubmit={(e) => {
            if (
              !confirm(
                '¿Quitar la llave de OpenAI? El chat volverá al modo demostración y el generador de diseños dejará de funcionar hasta que configures una nueva.',
              )
            ) {
              e.preventDefault();
            }
          }}
          className="bg-white border border-zinc-200/60 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4"
        >
          <p className="text-sm text-zinc-600">¿Ya no quieres usar OpenAI por ahora? Quita la llave guardada.</p>
          <SubmitButton className="shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm transition-all cursor-pointer">
            Quitar llave configurada
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
