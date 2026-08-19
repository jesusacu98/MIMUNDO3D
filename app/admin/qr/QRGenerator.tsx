'use client';

import { useMemo, useState } from 'react';
import { Download, QrCode as QrCodeIcon } from 'lucide-react';
import { buildQrSvg } from '@/lib/qr';

const inputClass =
  'w-full mt-2 px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-all';
const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';

function sanitizeFileName(name: string) {
  const trimmed = name.trim() || 'qr';
  const safe = trimmed.replace(/[\\/:*?"<>|]+/g, '-');
  return safe.toLowerCase().endsWith('.svg') ? safe : `${safe}.svg`;
}

export default function QRGenerator() {
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');

  // buildQrSvg es síncrona: no hace falta useEffect/estado para esto,
  // se calcula directo en el render (memoizado para no rehacerlo de más).
  const { svg, error } = useMemo(() => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return { svg: null, error: null };
    try {
      return { svg: buildQrSvg(trimmedUrl), error: null };
    } catch {
      return { svg: null, error: 'No se pudo generar el QR con ese texto.' };
    }
  }, [url]);

  const ready = svg !== null;

  const handleDownload = () => {
    if (!ready || !svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = sanitizeFileName(fileName);
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="bg-white border border-zinc-200/60 rounded-2xl p-6 sm:p-8 space-y-6">
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
              <p className="text-xs text-zinc-400">{error ?? 'Escribe una URL para generar el código QR'}</p>
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
