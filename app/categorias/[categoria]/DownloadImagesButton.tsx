'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

// Descarga en un ZIP las imágenes de los productos que se están viendo en la categoría (respeta
// los filtros activos). Sólo lo muestra CategoryProducts a admins, igual que "Copiar enlace".
// El ZIP se arma en el navegador: las imágenes son públicas (Storage con CORS abierto o archivos
// del propio sitio), así no se pasa por el servidor ni por el límite de respuesta de Vercel.

export interface DownloadImageItem {
  name: string;
  url: string;
}

function fileSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50) || 'imagen'
  );
}

function extensionFor(url: string, contentType: string | null): string {
  const fromType = contentType?.split(';')[0].split('/')[1]?.replace('jpeg', 'jpg');
  if (fromType && /^[a-z0-9]+$/.test(fromType)) return fromType;
  const fromUrl = new URL(url, window.location.origin).pathname.split('.').pop()?.toLowerCase();
  return fromUrl && /^[a-z0-9]{2,4}$/.test(fromUrl) ? fromUrl : 'jpg';
}

const CONCURRENCY = 4;

export default function DownloadImagesButton({ items, zipName }: { items: DownloadImageItem[]; zipName: string }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Una misma imagen usada por varios productos se baja una sola vez.
  const unique = items.filter((item, i) => items.findIndex((other) => other.url === item.url) === i);

  const handleDownload = async () => {
    if (unique.length === 0 || progress) return;
    setMessage(null);
    setProgress({ done: 0, total: unique.length });

    try {
      const { zipSync } = await import('fflate');
      const files: Record<string, Uint8Array> = {};
      let failed = 0;
      let done = 0;
      let next = 0;

      const worker = async () => {
        while (next < unique.length) {
          const index = next++;
          const item = unique[index];
          try {
            const res = await fetch(item.url);
            // Una ruta inexistente del propio sitio puede responder 200 con una página HTML: sólo se
            // aceptan respuestas de tipo imagen.
            const contentType = res.headers.get('content-type');
            if (!res.ok || !contentType?.startsWith('image/')) throw new Error(`${res.status} ${contentType}`);
            const ext = extensionFor(item.url, contentType);
            files[`${String(index + 1).padStart(2, '0')}-${fileSlug(item.name)}.${ext}`] = new Uint8Array(await res.arrayBuffer());
          } catch {
            failed++;
          }
          setProgress({ done: ++done, total: unique.length });
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, unique.length) }, worker));

      if (Object.keys(files).length === 0) {
        setMessage('No se pudo descargar ninguna imagen.');
        return;
      }

      // Las imágenes ya vienen comprimidas: level 0 (sólo empaquetar) es más rápido y pesa igual.
      const zip = zipSync(files, { level: 0 });
      const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${zipName}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      if (failed > 0) setMessage(`${failed} imagen(es) no se pudieron descargar.`);
    } catch (err) {
      console.error('Error al descargar las imágenes:', err);
      setMessage('No se pudo armar el ZIP.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={unique.length === 0 || progress !== null}
        title="Descarga las imágenes de los productos que estás viendo (con los filtros aplicados)"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {progress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        {progress ? `Descargando ${progress.done}/${progress.total}…` : `Descargar imágenes (${unique.length})`}
      </button>
      {message && <span className="text-xs text-red-600">{message}</span>}
    </span>
  );
}
