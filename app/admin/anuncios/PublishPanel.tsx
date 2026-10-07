'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Send } from 'lucide-react';
import type { AdRecord } from '@/lib/anuncios/config';
import type { SocialSettingsView } from '@/lib/social/settings';

type Network = 'instagram' | 'facebook';

interface NetworkResult {
  network: Network;
  ok: boolean;
  items: { id: string; url: string | null }[];
  error?: string;
}

const NETWORK_LABEL: Record<Network, string> = { instagram: 'Instagram', facebook: 'Facebook' };

export default function PublishPanel({
  ad,
  social,
  instagramText,
  facebookText,
  onPublished,
}: {
  ad: AdRecord;
  social: SocialSettingsView;
  instagramText: string;
  facebookText: string;
  onPublished: (ad: AdRecord) => void;
}) {
  const [networks, setNetworks] = useState<Record<Network, boolean>>({ instagram: social.hasInstagram, facebook: true });
  // Los anuncios en formato historia (9:16) se sugieren como historia; el resto como publicación.
  const [kind, setKind] = useState<'post' | 'story'>(ad.format === 'historia' ? 'story' : 'post');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<NetworkResult[] | null>(null);

  if (!social.connected) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
        <span className="font-semibold text-zinc-800">Publicar directo en Instagram y Facebook:</span> primero conecta tus cuentas en{' '}
        <Link href="/admin/redes" className="font-semibold text-primary-dark hover:underline">
          Redes sociales
        </Link>
        . Mientras tanto, descarga la imagen y copia el texto de arriba.
      </div>
    );
  }

  const selected = (Object.keys(networks) as Network[]).filter((n) => networks[n]);
  const alreadyOn = selected.filter((n) => ad.published.some((p) => p.network === n && p.kind === kind));
  const count = ad.imageUrls.length;

  async function publish() {
    const where = selected.map((n) => NETWORK_LABEL[n]).join(' y ');
    const what = kind === 'story' ? `${count} historia${count === 1 ? '' : 's'}` : count > 1 ? `un carrusel de ${count} imágenes` : 'una publicación';
    const dup = alreadyOn.length ? `\n\nOjo: este anuncio ya se publicó antes en ${alreadyOn.map((n) => NETWORK_LABEL[n]).join(' y ')}; se publicará otra vez.` : '';
    if (!window.confirm(`Se publicará ${what} en ${where} ahora mismo, con el texto que ves arriba.${dup}\n\n¿Continuar?`)) return;

    setLoading(true);
    setError('');
    setResults(null);
    try {
      const response = await fetch(`/api/admin/anuncios/${ad.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networks: selected, kind, captions: { instagram: instagramText, facebook: facebookText } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo publicar.');
      setResults(data.results as NetworkResult[]);
      if (data.ad) onPublished(data.ad as AdRecord);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-zinc-900">Publicar directo</h3>
        <span className="text-xs text-zinc-500">
          Página: {social.pageName}
          {social.igUsername ? ` · Instagram: @${social.igUsername}` : ''}
        </span>
      </div>

      {social.missingPermissions && social.missingPermissions.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          A la conexión le faltan permisos ({social.missingPermissions.join(', ')}), así que Meta rechazará la publicación.{' '}
          <Link href="/admin/redes" className="font-semibold underline">
            Cómo arreglarlo
          </Link>
          .
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {(['instagram', 'facebook'] as Network[]).map((n) => {
          const disabled = n === 'instagram' && !social.hasInstagram;
          return (
            <label key={n} className={`flex items-center gap-2 text-sm ${disabled ? 'text-zinc-400' : 'text-zinc-800 cursor-pointer'}`}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={networks[n] && !disabled}
                onChange={(e) => setNetworks((prev) => ({ ...prev, [n]: e.target.checked }))}
                className="w-4 h-4 accent-primary"
              />
              {NETWORK_LABEL[n]}
              {disabled ? ' (la Página no tiene Instagram vinculado)' : ''}
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-800">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name={`kind-${ad.id}`} checked={kind === 'post'} onChange={() => setKind('post')} className="accent-primary" />
          Publicación {count > 1 ? '(carrusel)' : ''}
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" name={`kind-${ad.id}`} checked={kind === 'story'} onChange={() => setKind('story')} className="accent-primary" />
          Historia {count > 1 ? `(${count}, una por lámina)` : ''}
        </label>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {kind === 'story'
          ? 'Las historias no llevan descripción: sólo se publica la imagen. Lo ideal es el formato 9:16.'
          : 'Se publica con la descripción y los hashtags de arriba (Instagram con los que dejaste marcados; Facebook con los primeros 3). Instagram acepta hasta 10 imágenes por carrusel.'}
      </p>

      <button
        type="button"
        onClick={publish}
        disabled={loading || selected.length === 0}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {loading ? 'Publicando… (puede tardar un minuto)' : 'Publicar ahora'}
      </button>

      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {results && (
        <ul className="mt-3 space-y-2">
          {results.map((r) => (
            <li
              key={r.network}
              className={`rounded-xl border px-4 py-3 text-sm ${r.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}
            >
              <span className="font-semibold">{NETWORK_LABEL[r.network]}:</span>{' '}
              {r.ok ? 'publicado.' : `no se pudo publicar${r.items.length ? ` (salieron ${r.items.length} de ${count})` : ''}. ${r.error ?? ''}`}
              {!r.ok && /permission|permiso/i.test(r.error ?? '') && (
                <span className="block mt-1 text-xs">
                  Es un tema de permisos de la app/token de Meta, no del anuncio:{' '}
                  <Link href="/admin/redes" className="underline font-semibold">
                    revisa la conexión
                  </Link>
                  .
                </span>
              )}
              {r.items.map((item, i) =>
                item.url ? (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 underline">
                    {r.items.length > 1 ? `ver ${i + 1}` : 'ver publicación'} <ExternalLink className="w-3 h-3" />
                  </a>
                ) : null,
              )}
            </li>
          ))}
        </ul>
      )}

      {ad.published.length > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-3">
          <div className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Ya publicado</div>
          <ul className="mt-2 space-y-1 text-xs text-zinc-600">
            {ad.published.map((p) => (
              <li key={p.id + p.at}>
                {NETWORK_LABEL[p.network]} · {p.kind === 'story' ? 'historia' : 'publicación'} ·{' '}
                {new Date(p.at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mazatlan' })}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="ml-2 underline">
                    ver
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
