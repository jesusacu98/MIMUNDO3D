'use client';

import { useMemo, useState } from 'react';
import { Download, QrCode as QrCodeIcon } from 'lucide-react';
import { buildQrSvg, buildWifiPayload, downloadSvg, type QrShape, type WifiSecurity } from '@/lib/qr';

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';

export default function QRGenerator() {
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [shape, setShape] = useState<QrShape>('square');
  const [mode, setMode] = useState<'url' | 'wifi'>('url');
  const [ssid, setSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [security, setSecurity] = useState<WifiSecurity>('WPA');
  const [hidden, setHidden] = useState(false);

  // buildQrSvg es síncrona: no hace falta useEffect/estado para esto,
  // se calcula directo en el render (memoizado para no rehacerlo de más).
  const { svg, error } = useMemo(() => {
    const data =
      mode === 'url'
        ? url.trim()
        : ssid.trim()
          ? buildWifiPayload({ ssid: ssid.trim(), password: wifiPassword, security, hidden })
          : '';
    if (!data) return { svg: null, error: null };
    try {
      return { svg: buildQrSvg(data, { shape }), error: null };
    } catch {
      return { svg: null, error: 'No se pudo generar el QR con ese texto.' };
    }
  }, [mode, url, ssid, wifiPassword, security, hidden, shape]);

  const ready = svg !== null;

  const handleDownload = () => {
    if (!ready || !svg) return;
    downloadSvg(svg, fileName);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Tipo de código">
          {([['url', 'Enlace (URL)'], ['wifi', 'Red Wi-Fi']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                mode === value ? 'border-primary bg-primary/5 text-primary' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === 'url' ? (
          <div>
            <label htmlFor="url" className={labelClass}>
              URL <span className="text-primary">*</span>
            </label>
            <input
              id="url"
              type="text"
              placeholder="https://mimundo3d.studio/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className={inputClass}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="ssid" className={labelClass}>
                Nombre de la red (SSID) <span className="text-primary">*</span>
              </label>
              <input id="ssid" type="text" placeholder="ej. Cafe_Luna" value={ssid} onChange={(e) => setSsid(e.target.value)} className={inputClass} autoComplete="off" />
            </div>
            <div>
              <label htmlFor="security" className={labelClass}>
                Seguridad
              </label>
              <select id="security" value={security} onChange={(e) => setSecurity(e.target.value as WifiSecurity)} className={inputClass}>
                <option value="WPA">WPA/WPA2/WPA3 (la más común)</option>
                <option value="WEP">WEP</option>
                <option value="nopass">Sin contraseña</option>
              </select>
            </div>
            {security !== 'nopass' && (
              <div>
                <label htmlFor="wifiPassword" className={labelClass}>
                  Contraseña
                </label>
                <input id="wifiPassword" type="text" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} className={inputClass} autoComplete="off" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="accent-primary" />
              Red oculta
            </label>
            <p className="text-xs text-zinc-500">Al escanearlo con la cámara del celular, se ofrece conectarse a la red directamente. Todo se genera en tu navegador; la contraseña no se envía a ningún servidor.</p>
          </div>
        )}
        <div>
          <span className={labelClass}>Forma</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([['square', 'Cuadrado'], ['round', 'Circular']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setShape(value)}
                aria-pressed={shape === value}
                className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  shape === value ? 'border-primary bg-primary/5 text-primary' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">Circular pone el código dentro de un círculo con aro (los módulos siguen siendo cuadrados para que se lea bien).</p>
        </div>
        <div>
          <label htmlFor="fileName" className={labelClass}>
            Nombre para descargar
          </label>
          <input
            id="fileName"
            type="text"
            placeholder="ej. tarjeta-mesa-1"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className={inputClass}
          />
          <p className="text-xs text-zinc-500 mt-1.5">Se usa como nombre del archivo al descargar (se guarda como .svg).</p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-6">
        <div
          className="relative w-full aspect-square max-w-[320px] rounded-xl border border-zinc-200 flex items-center justify-center overflow-hidden p-4"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #e4e4e7 25%, transparent 25%), linear-gradient(-45deg, #e4e4e7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e4e4e7 75%), linear-gradient(-45deg, transparent 75%, #e4e4e7 75%)',
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          }}
        >
          {ready && svg ? (
            <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-300 px-6 text-center">
              <QrCodeIcon className="w-12 h-12" />
              <p className="text-xs text-zinc-400">{error ?? (mode === 'url' ? 'Escribe una URL para generar el código QR' : 'Escribe el nombre de la red para generar el código QR')}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!ready}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 w-full"
        >
          <Download className="w-4 h-4" />
          Descargar SVG
        </button>
      </div>
    </div>
  );
}
