// Renderiza código OpenSCAD a STL dentro de WASM (paquete `openscad-wasm-prebuilt`): el código que
// escribe el modelo de IA corre en el sandbox de WebAssembly, sin acceso a red, disco ni al
// proceso de Node — por eso es seguro ejecutar código generado por IA (que podría verse influido
// por el texto de un logo/imagen de referencia) sin un sandbox extra.
//
// Es Node-only y `next.config.ts` lo marca en `serverExternalPackages`.

const MAX_CODE_CHARS = 20_000;
const MAX_FN = 128;

export interface ScadRender {
  /** STL binario codificado en base64. */
  stlBase64: string;
  triangles: number;
  /** Medidas (mm) del volumen que ocupa la pieza. */
  size: { x: number; y: number; z: number };
  /** Avisos de OpenSCAD (malla no hermética, módulos inexistentes...) — el render igual salió. */
  warnings: string[];
}

export class ScadError extends Error {}

// El WASM corre en el mismo hilo y no se puede cortar a media ejecución: en vez de un timeout, se
// rechazan de entrada las construcciones que disparan el tiempo de cálculo o leen archivos.
function precheck(code: string): string | null {
  if (code.length > MAX_CODE_CHARS) return 'El código es demasiado largo; simplificá el diseño.';
  if (/\bminkowski\s*\(/.test(code)) return 'No uses minkowski() (es muy lento); usá hull() o redondeos con esferas/cilindros.';
  if (/\b(text|import|surface)\s*\(/.test(code)) return 'No uses text(), import() ni surface() (no hay fuentes ni archivos disponibles).';
  if (/^\s*(include|use)\s*</m.test(code)) return 'No uses include/use: no hay librerías disponibles, escribí todo con primitivas.';
  for (const m of code.matchAll(/\$fn\s*=\s*(\d+)/g)) {
    if (Number(m[1]) > MAX_FN) return `$fn no puede pasar de ${MAX_FN}.`;
  }
  return null;
}

// Líneas del log de OpenSCAD que sí importan (se descarta el ruido de localización/fontconfig).
function relevantLog(log: string[]): string[] {
  return log
    .map((line) => line.trim())
    .filter((line) => /^(ERROR|WARNING|EXPORT-WARNING)/.test(line))
    .filter((line) => !/localization|fontconfig/i.test(line));
}

export async function renderScad(code: string): Promise<ScadRender> {
  const problem = precheck(code);
  if (problem) throw new ScadError(problem);

  const log: string[] = [];
  // Import dinámico: el paquete pesa ~11MB y sólo se necesita al pedir un STL.
  const { createOpenSCAD } = await import('openscad-wasm-prebuilt');
  const openscad = await createOpenSCAD({ print: (s) => log.push(s), printErr: (s) => log.push(s) });

  let ascii: string;
  try {
    ascii = await openscad.renderToStl(code);
  } catch {
    const errors = relevantLog(log).filter((line) => line.startsWith('ERROR'));
    throw new ScadError(errors.join(' ') || 'OpenSCAD no generó geometría 3D (resultado vacío o sólo 2D).');
  }

  const converted = asciiToBinaryStl(ascii);
  if (converted.triangles === 0) throw new ScadError('OpenSCAD no generó geometría 3D (resultado vacío).');

  return {
    stlBase64: converted.buffer.toString('base64'),
    triangles: converted.triangles,
    size: converted.size,
    warnings: relevantLog(log),
  };
}

// El STL ASCII de OpenSCAD pesa ~5x más que el binario; se convierte para no chocar con el
// límite de tamaño de respuesta de Vercel en piezas con muchas caras.
function asciiToBinaryStl(ascii: string) {
  const coords: number[] = [];
  for (const m of ascii.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) {
    coords.push(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  const triangles = Math.floor(coords.length / 9);
  const buffer = Buffer.alloc(84 + triangles * 50);
  buffer.writeUInt32LE(triangles, 80);

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let t = 0; t < triangles; t++) {
    const v = coords.slice(t * 9, t * 9 + 9);
    const ux = v[3] - v[0], uy = v[4] - v[1], uz = v[5] - v[2];
    const wx = v[6] - v[0], wy = v[7] - v[1], wz = v[8] - v[2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    let offset = 84 + t * 50;
    for (const n of [nx, ny, nz, ...v]) {
      buffer.writeFloatLE(n, offset);
      offset += 4;
    }
    for (let i = 0; i < 9; i++) {
      const axis = i % 3;
      if (v[i] < min[axis]) min[axis] = v[i];
      if (v[i] > max[axis]) max[axis] = v[i];
    }
  }

  const size =
    triangles > 0
      ? { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] }
      : { x: 0, y: 0, z: 0 };
  return { buffer, triangles, size };
}
