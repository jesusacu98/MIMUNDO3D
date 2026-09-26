'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';

const labelClass = 'text-xs font-bold text-zinc-800 uppercase tracking-wider';

// Elige la imagen del recuadro de la categoría en el inicio (proporción 2:1): se puede arrastrar y
// soltar un archivo sobre el recuadro o hacer clic para elegirlo. Muestra la vista previa del
// archivo nuevo o de la imagen ya guardada, y una casilla para quitarla al editar.
export default function CategoryImagePicker({ currentUrl }: { currentUrl?: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const src = previewUrl ?? (remove ? null : (currentUrl ?? null));

  function showFile(file: File | null) {
    setDropError(null);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    setFileName(file ? file.name : null);
    if (file) setRemove(false);
  }

  // Un archivo soltado no pasa solo al <input>: se le asigna con DataTransfer para que el
  // formulario lo envíe igual que uno elegido con el selector.
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragActive(false);

    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (!file) {
      setDropError('Suelta un archivo de imagen (JPG, PNG, WebP...).');
      return;
    }
    if (inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }
    showFile(file);
  }

  function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current += 1;
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  }

  return (
    <div>
      <span className={labelClass}>Imagen en el inicio</span>

      <input
        ref={inputRef}
        name="image_file"
        type="file"
        accept="image/*"
        onChange={(e) => showFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Elegir o arrastrar la imagen de la categoría"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative mt-2 aspect-[2/1] overflow-hidden rounded-xl border-2 cursor-pointer transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : src ? 'border-zinc-200 bg-zinc-100' : 'border-dashed border-zinc-300 bg-zinc-50 hover:border-zinc-400'
        }`}
      >
        {src && (
          // Vista previa de un archivo local (blob:) o de Supabase Storage.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Vista previa" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {(!src || dragActive) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            {dragActive ? <Upload className="h-7 w-7 text-primary" /> : <ImagePlus className="h-7 w-7 text-zinc-400" />}
            <p className="text-sm text-zinc-600">
              {dragActive ? (
                <span className="font-medium text-primary">Suelta la imagen aquí</span>
              ) : (
                <>
                  Arrastra una imagen aquí o <span className="font-medium text-primary">haz clic para elegirla</span>
                </>
              )}
            </p>
          </div>
        )}

        {src && !dragActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/55 px-4 text-center text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Arrastra otra imagen o haz clic para cambiarla
          </div>
        )}
      </div>

      {fileName && <p className="mt-2 text-xs text-zinc-600">Nueva imagen: {fileName}</p>}
      {dropError && <p className="mt-2 text-xs text-red-600">{dropError}</p>}

      <p className="text-xs text-zinc-500 mt-1.5">
        Es la foto del recuadro de esta categoría en &quot;Explora por categoría&quot;. Se recorta en proporción 2:1 (el doble de ancha que alta), como
        1200×600 px; máximo 10MB. Si no subes ninguna, se usan los banners de Banners → &quot;Inicio · imagen de categoría&quot;.
      </p>

      {currentUrl && !previewUrl && (
        <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
          <input
            type="checkbox"
            name="remove_image"
            checked={remove}
            onChange={(e) => setRemove(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 accent-primary"
          />
          Quitar la imagen actual
        </label>
      )}
    </div>
  );
}
