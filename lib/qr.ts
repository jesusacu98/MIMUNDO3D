import QRCode from 'qrcode';

interface BuildQrSvgOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  moduleSize?: number;
  margin?: number;
}

// Genera el SVG a mano (cuadrados rellenos, path por fila de módulos
// contiguos) en vez de usar QRCode.toString(..., { type: 'svg' }): ese
// renderer dibuja líneas con `stroke` sin `stroke-width` explícito, lo que
// se ve distorsionado/diagonal al escalar el SVG a un tamaño no múltiplo
// entero del viewBox (como pasa al mostrarlo en una vista previa responsive).
// Con rectángulos rellenos no depende del stroke y escala limpio siempre.
export function buildQrSvg(data: string, options: BuildQrSvgOptions = {}): string {
  const { errorCorrectionLevel = 'H', moduleSize = 10, margin = 4 } = options;

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

  // Sin rect de fondo: el SVG queda con fondo transparente.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}"><path d="${path}" fill="#000000"/></svg>`;
}
