'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Unplug } from 'lucide-react';
import type { SocialSettingsView } from '@/lib/social/settings';

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';
const helpClass = 'mt-1.5 text-xs text-zinc-500';
const cardClass = 'bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6';

interface PageOption {
  id: string;
  name: string;
  igUsername: string | null;
}

export default function RedesClient({ settings }: { settings: SocialSettingsView }) {
  const router = useRouter();
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [userToken, setUserToken] = useState('');
  const [pages, setPages] = useState<PageOption[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [pageId, setPageId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function call(action: 'pages' | 'save') {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/redes/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, appId, appSecret, userToken, pageId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo conectar.');
      if (action === 'pages') {
        setPages(data.pages as PageOption[]);
        setMissing((data.missingPermissions as string[]) ?? []);
        setPageId((data.pages as PageOption[])[0]?.id ?? '');
      } else {
        // Ya no hacen falta: se limpian del navegador.
        setAppSecret('');
        setUserToken('');
        setPages(null);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo conectar.');
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    if (!window.confirm('¿Desconectar las cuentas? Ya no se podrá publicar desde el admin hasta volver a conectarlas.')) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/redes/disconnect', { method: 'POST' });
      if (!response.ok) throw new Error('No se pudo desconectar.');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo desconectar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {settings.connected && (
        <section className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-zinc-900">Conectado</div>
                <div className="text-sm text-zinc-600 mt-0.5">
                  Página de Facebook: <span className="font-semibold">{settings.pageName}</span>
                </div>
                <div className="text-sm text-zinc-600">
                  Instagram:{' '}
                  {settings.hasInstagram ? (
                    <span className="font-semibold">@{settings.igUsername}</span>
                  ) : (
                    <span className="text-amber-700">esta Página no tiene una cuenta de Instagram vinculada (sólo se podrá publicar en Facebook)</span>
                  )}
                </div>
                {settings.missingPermissions && settings.missingPermissions.length > 0 && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 space-y-2">
                    <p>
                      <strong>Esta conexión no puede publicar todavía:</strong> a tu token le faltan{' '}
                      <span className="font-mono text-xs">{settings.missingPermissions.join(', ')}</span>.
                    </p>
                    <p>
                      Es lo que dice Meta como «permiso no disponible» al publicar. Cuando una app de Meta es nueva, cada permiso solo se puede pedir si lo agregas
                      en un <strong>caso de uso</strong>: en developers.facebook.com abre tu app → <strong>Casos de uso</strong> → personaliza «Administrar todo en tu Página» y
                      «Administrar mensajes y contenido en Instagram» y agrega ahí esos permisos (se pueden usar sin revisión porque eres administrador de la app). Después genera un
                      token nuevo en el Explorador de la Graph API, marcando esos permisos, y vuelve a conectar aquí abajo.
                    </p>
                  </div>
                )}
                {settings.missingPermissions && settings.missingPermissions.length === 0 && (
                  <div className="mt-2 text-xs text-emerald-700">Permisos de publicación: completos.</div>
                )}
                {settings.missingPermissions === null && (
                  <div className="mt-2 text-xs text-zinc-500">No se guardaron los permisos de esta conexión; vuelve a conectar para verificarlos.</div>
                )}
                {settings.connectedAt && (
                  <div className="text-xs text-zinc-400 mt-1">
                    Desde {new Date(settings.connectedAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mazatlan' })}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={disconnect}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 hover:border-red-400 hover:text-red-600 text-sm font-semibold text-zinc-700 transition-colors disabled:opacity-60"
            >
              <Unplug className="w-4 h-4" /> Desconectar
            </button>
          </div>
        </section>
      )}

      <section className={cardClass}>
        <h2 className={labelClass}>{settings.connected ? 'Volver a conectar (por ejemplo, si cambiaste de Página)' : 'Cómo conectar'}</h2>
        <ol className="mt-3 space-y-2 text-sm text-zinc-700 list-decimal pl-5">
          <li>
            Tu cuenta de Instagram tiene que ser <strong>profesional</strong> (empresa o creador) y estar <strong>vinculada a tu Página de Facebook</strong>.
          </li>
          <li>
            En{' '}
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-dark hover:underline">
              developers.facebook.com/apps
            </a>{' '}
            crea una app (si no tienes una) y copia su <strong>ID de la app</strong> y su <strong>clave secreta</strong> (Configuración → Básica).
          </li>
          <li>
            Abre el{' '}
            <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-dark hover:underline">
              Explorador de la Graph API
            </a>
            , elige tu app y genera un <strong>token de usuario</strong> con estos permisos: <code className="font-mono text-xs">pages_show_list</code>,{' '}
            <code className="font-mono text-xs">pages_read_engagement</code>, <code className="font-mono text-xs">pages_manage_posts</code>,{' '}
            <code className="font-mono text-xs">instagram_basic</code> e <code className="font-mono text-xs">instagram_content_publish</code> (y{' '}
            <code className="font-mono text-xs">business_management</code> si tu Página está dentro de un Portafolio comercial). Al autorizar, marca tu Página y tu
            Instagram.
          </li>
          <li>Pega aquí los tres datos. El sitio cambia ese token por uno de la Página que no vence; la clave secreta y el token de usuario no se guardan.</li>
        </ol>
        <p className="mt-3 text-xs text-zinc-500">
          Según la documentación de Meta, para publicar en tus propias cuentas basta con ser administrador de la app: no necesitas enviarla a revisión.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>ID de la app</label>
            <input value={appId} onChange={(e) => setAppId(e.target.value)} inputMode="numeric" placeholder="1234567890" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Clave secreta de la app</label>
            <input value={appSecret} onChange={(e) => setAppSecret(e.target.value)} type="password" autoComplete="off" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Token de usuario (del Explorador de la Graph API)</label>
            <textarea value={userToken} onChange={(e) => setUserToken(e.target.value)} rows={3} autoComplete="off" spellCheck={false} className={inputClass + ' font-mono text-xs resize-y'} />
            <p className={helpClass}>Dura una hora, pero alcanza para conectar: aquí se cambia por el token permanente de la Página.</p>
          </div>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {!pages ? (
          <button
            type="button"
            onClick={() => call('pages')}
            disabled={loading || !appId.trim() || !appSecret.trim() || !userToken.trim()}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Buscar mis Páginas
          </button>
        ) : (
          <div className="mt-5">
            <div className={labelClass}>¿Cuál Página usar?</div>
            <div className="mt-2 space-y-2">
              {pages.map((p) => (
                <label key={p.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer ${pageId === p.id ? 'border-primary bg-primary/5' : 'border-zinc-200'}`}>
                  <input type="radio" name="page" checked={pageId === p.id} onChange={() => setPageId(p.id)} className="accent-primary" />
                  <span className="font-semibold text-zinc-900">{p.name}</span>
                  <span className="text-zinc-500">{p.igUsername ? `Instagram @${p.igUsername}` : 'sin Instagram vinculado'}</span>
                </label>
              ))}
            </div>
            {(() => {
              const chosen = pages.find((p) => p.id === pageId);
              if (chosen?.igUsername && missing.length === 0) return null;
              return (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
                  {missing.length > 0 && (
                    <p>
                      <strong>Al token le faltan permisos:</strong> <span className="font-mono text-xs">{missing.join(', ')}</span>. Vuelve al Explorador de la Graph API,
                      agrégalos, genera el token otra vez y, al autorizar, marca tu Página <strong>y tu cuenta de Instagram</strong>.
                    </p>
                  )}
                  {chosen && !chosen.igUsername && (
                    <p>
                      <strong>Meta no devolvió una cuenta de Instagram para «{chosen.name}».</strong>
                      {missing.length === 0
                        ? ' El token sí tiene los permisos, así que lo más probable es que Instagram no esté vinculado a esta Página: en Facebook entra a la Página → Configuración → Cuentas vinculadas (o «Instagram»), conéctala ahí, y repite el proceso. La cuenta de Instagram también debe ser profesional (empresa o creador).'
                        : ' Con los permisos corregidos suele aparecer.'}
                    </p>
                  )}
                  <p className="text-xs">Si sólo vas a publicar en Facebook, puedes conectar así y vincular Instagram después.</p>
                </div>
              );
            })()}
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => call('save')}
                disabled={loading || !pageId}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Conectar esta Página
              </button>
              <button type="button" onClick={() => { setPages(null); setMissing([]); }} className="px-4 py-2.5 rounded-xl border border-zinc-300 text-sm font-semibold text-zinc-700">
                Atrás
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
