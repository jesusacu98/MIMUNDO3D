import QRCode from 'qrcode';

interface BuildQrSvgOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  moduleSize?: number;
  margin?: number;
  /** 'square' (default): sólo el código. 'round': el código dentro de un círculo con aro, relleno con módulos decorativos. */
  shape?: QrShape;
}

export type QrShape = 'square' | 'round';

const QUIET_GAP = 2;

// Genera el SVG a mano (cuadrados rellenos, path por fila de módulos
// contiguos) en vez de usar QRCode.toString(..., { type: 'svg' }): ese
// renderer dibuja líneas con `stroke` sin `stroke-width` explícito, lo que
// se ve distorsionado/diagonal al escalar el SVG a un tamaño no múltiplo
// entero del viewBox (como pasa al mostrarlo en una vista previa responsive).
// Con rectángulos rellenos no depende del stroke y escala limpio siempre.
export function buildQrSvg(data: string, options: BuildQrSvgOptions = {}): string {
  const { errorCorrectionLevel = 'H', moduleSize = 10, margin = 4, shape = 'square' } = options;

  const qr = QRCode.create(data, { errorCorrectionLevel });
  const size = qr.modules.size;
  const dim = (size + margin * 2) * moduleSize;

  let path = '';
  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (qr.modules.get(row, col)) {
        let runLength = 1;
        while (col + runLength < size && qr.modules.get(row, col + runLength)) runLength++;

        const x = (col + margin) * moduleSize;
        const y = (row + margin) * moduleSize;
        const w = runLength * moduleSize;
        path += `M${x} ${y}h${w}v${moduleSize}h-${w}Z`;
        col += runLength;
      } else {
        col++;
      }
    }
  }

  if (shape === 'round') {
    // Los módulos del código siguen siendo cuadrados (si se recortaran en círculo se perderían
    // las esquinas y ya no se leería). El resto del círculo se rellena con módulos decorativos
    // en la misma cuadrícula, dejando QUIET_GAP módulos de zona de silencio alrededor del código
    // real para que el lector lo siga ubicando. Son pseudoaleatorios pero deterministas (misma
    // URL -> mismo SVG). Los que sobresalen del borde quedan tapados por el aro negro.
    const half = (size * moduleSize) / 2;
    const discR = half * Math.SQRT2 + 2 * moduleSize;
    const ring = 1.5 * moduleSize;
    const c = discR + ring;
    const offset = c - half;
    const shifted = path.replace(/M(\d+) (\d+)/g, (_, x, y) => `M${Number(x) - margin * moduleSize + offset} ${Number(y) - margin * moduleSize + offset}`);

    let seed = 0;
    for (let i = 0; i < data.length; i++) seed = (Math.imul(seed, 31) + data.charCodeAt(i)) | 0;
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const reach = Math.ceil(c / moduleSize);
    let filler = '';
    for (let row = -reach; row < size + reach; row++) {
      for (let col = -reach; col < size + reach; col++) {
        if (row >= -QUIET_GAP && row < size + QUIET_GAP && col >= -QUIET_GAP && col < size + QUIET_GAP) continue;
        const x = offset + col * moduleSize;
        const y = offset + row * moduleSize;
        if (Math.hypot(x + moduleSize / 2 - c, y + moduleSize / 2 - c) > discR) continue;
        if (random() < 0.5) filler += `M${x} ${y}h${moduleSize}v${moduleSize}h${-moduleSize}Z`;
      }
    }

    const circle = (r: number) => `M${c - r} ${c}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${2 * c} ${2 * c}"><path d="${circle(c)}${circle(discR)}" fill="#000000" fill-rule="evenodd"/><path d="${filler}" fill="#000000"/><path d="${shifted}" fill="#000000"/></svg>`;
  }

  // Sin rect de fondo: el SVG queda con fondo transparente.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}"><path d="${path}" fill="#000000"/></svg>`;
}

export function sanitizeSvgFileName(name: string): string {
  const trimmed = name.trim() || 'qr';
  const safe = trimmed.replace(/[\\/:*?"<>|]+/g, '-');
  return safe.toLowerCase().endsWith('.svg') ? safe : `${safe}.svg`;
}

// Sólo navegador: dispara la descarga de un SVG ya generado con buildQrSvg.
export function downloadSvg(svg: string, fileName: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = sanitizeSvgFileName(fileName);
  link.click();
  URL.revokeObjectURL(objectUrl);
}
