import sharp from 'sharp';
import { Potrace } from 'potrace';
import { locatePiece, type Box } from '@/lib/disenos/canvas';

// "Trazado exacto": convierte la foto de un expositor en arte lineal SIN IA de imagen. A
// diferencia de "Imagen para Fusion" (lib/disenos/fusion.ts, que le pide al modelo que redibuje la
// pieza y por eso cambia proporciones), acá la foto se traza con un proceso determinista:
//   1) se separa la pieza del fondo, 2) se reduce a sus colores planos, 3) se traza el contorno de
//   cada región (potrace) y 4) lo que es casi un círculo/cuadrado/rectángulo se reemplaza por la
//   figura geométrica exacta. Las posiciones y proporciones son las de la foto.
// Los QR y la tarjeta de datos bancarios quedan como recuadros vacíos (se completan en el laminador).
// Devuelve un PNG blanco y negro (para el plugin de Fusion) y un SVG vectorial (para insertar
// directo en un boceto). Los umbrales en píxeles asumen el lienzo de trabajo de WORK_SIDE.

/** Lado mayor del lienzo de trabajo (la foto recortada se lleva a este tamaño). */
const WORK_SIDE = 2048;
const STROKE = 4;
const PAD = 40;
/** Gradiente (0-255) a partir del cual un borde frena la inundación del fondo. */
const GRAD_T = 4;
const K = 6;
/** Distancia en Lab por debajo de la cual dos colores se consideran el mismo. */
const MERGE_DE = 28;
const MIN_AREA = 24;
const SIL_BLUR = 24;
/** Distancia en Lab al color de la placa para contar como su núcleo seguro. */
const CORE_DE = 18;
/** Grosor medio (px) por debajo del cual una región es un anillo de transición, no una figura. */
const RING_PX = 3.2;
/** Trazos más finos que esto (fracción del ancho) se dibujan rellenos en vez de con contorno. */
const THIN = 0.011;

type Mask = Uint8Array;

interface Comp {
  id: number;
  k: number;
  area: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface Crop {
  mask: Mask;
  w: number;
  h: number;
}

interface Shape {
  c: Comp;
  f: Crop;
  /** Área con los huecos rellenos. */
  Af: number;
  thick: number;
  holeFrac: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  kind: 'path' | 'circle' | 'rect';
  r: number;
  rx: number;
  square: boolean;
  solid: boolean;
}

function rgb2lab(r: number, g: number, b: number): [number, number, number] {
  const f = (v: number) => {
    v /= 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };
  r = f(r);
  g = f(g);
  b = f(b);
  const h = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = h((r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047);
  const y = h(r * 0.2126 + g * 0.7152 + b * 0.0722);
  const z = h((r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** Erosión/dilatación con elemento cuadrado de radio r (separable). */
function morph(src: Mask, W: number, H: number, r: number, erode: boolean): Mask {
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = erode ? 1 : 0;
      for (let d = -r; d <= r; d++) {
        const xx = x + d;
        const p = xx < 0 || xx >= W ? 0 : src[y * W + xx];
        if (erode ? !p : p) {
          v = erode ? 0 : 1;
          break;
        }
      }
      tmp[y * W + x] = v;
    }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let v = erode ? 1 : 0;
      for (let d = -r; d <= r; d++) {
        const yy = y + d;
        const p = yy < 0 || yy >= H ? 0 : tmp[yy * W + x];
        if (erode ? !p : p) {
          v = erode ? 0 : 1;
          break;
        }
      }
      out[y * W + x] = v;
    }
  return out;
}

/** Etiqueta componentes 4-conexos de los píxeles con key >= 0 (misma key = misma región). */
function label(key: Int32Array, W: number, H: number): { lab: Int32Array; comps: Comp[] } {
  const lab = new Int32Array(W * H).fill(-1);
  const comps: Comp[] = [];
  const q = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (key[s] < 0 || lab[s] >= 0) continue;
    const id = comps.length;
    const k = key[s];
    let head = 0, tail = 0, area = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
    q[tail++] = s;
    lab[s] = id;
    while (head < tail) {
      const p = q[head++];
      const x = p % W;
      const y = (p / W) | 0;
      area++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (x > 0 && lab[p - 1] < 0 && key[p - 1] === k) { lab[p - 1] = id; q[tail++] = p - 1; }
      if (x < W - 1 && lab[p + 1] < 0 && key[p + 1] === k) { lab[p + 1] = id; q[tail++] = p + 1; }
      if (y > 0 && lab[p - W] < 0 && key[p - W] === k) { lab[p - W] = id; q[tail++] = p - W; }
      if (y < H - 1 && lab[p + W] < 0 && key[p + W] === k) { lab[p + W] = id; q[tail++] = p + W; }
    }
    comps.push({ id, k, area, x0, y0, x1, y1 });
  }
  return { lab, comps };
}

/** Máscara recortada (con margen m) de un componente, con los huecos rellenos. */
function filledCrop(lab: Int32Array, W: number, c: Comp, m: number): Crop {
  const w = c.x1 - c.x0 + 1 + 2 * m;
  const h = c.y1 - c.y0 + 1 + 2 * m;
  const a = new Uint8Array(w * h);
  for (let y = c.y0; y <= c.y1; y++)
    for (let x = c.x0; x <= c.x1; x++) if (lab[y * W + x] === c.id) a[(y - c.y0 + m) * w + (x - c.x0 + m)] = 1;
  const out = new Uint8Array(w * h).fill(1);
  const q = new Int32Array(w * h);
  let head = 0, tail = 0;
  q[tail++] = 0;
  out[0] = 0;
  while (head < tail) {
    const p = q[head++];
    const x = p % w;
    const y = (p / w) | 0;
    const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1];
    for (const n of nb)
      if (n >= 0 && out[n] && !a[n]) {
        out[n] = 0;
        q[tail++] = n;
      }
  }
  return { mask: out, w, h };
}

function maskToRaw(mask: Mask): Buffer {
  const buf = Buffer.alloc(mask.length);
  for (let i = 0; i < mask.length; i++) buf[i] = mask[i] ? 255 : 0;
  return buf;
}

/** Contorno de una máscara como el atributo `d` de un <path> (curvas Bézier de potrace). */
async function tracePath(mask: Mask, w: number, h: number): Promise<string> {
  const img = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) img[i] = mask[i] ? 0 : 255;
  const png = await sharp(img, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
  const tracer = new Potrace({ threshold: 128, turdSize: 2, optTolerance: 0.4, alphaMax: 1 });
  // Los tipos de @types/potrace declaran (potrace, error), pero la librería llama al callback
  // sólo con el error.
  await new Promise<void>((resolve, reject) =>
    (tracer.loadImage as unknown as (image: Buffer, cb: (error: Error | null) => void) => void).call(tracer, png, (error) =>
      error ? reject(error) : resolve(),
    ),
  );
  const tag = (tracer.getPathTag as unknown as () => string).call(tracer);
  return /d="([^"]+)"/.exec(tag)?.[1] ?? '';
}

const median = (values: number[]) => values.slice().sort((p, q) => p - q)[values.length >> 1];

export interface ExactTrace {
  /** PNG blanco y negro puro. */
  png: Buffer;
  /** SVG vectorial con las mismas figuras (círculos, rectángulos y trazos reales). */
  svg: string;
  /** Proporción ancho/alto de la pieza trazada. */
  ratio: number;
  /** Cuántas figuras exactas se reconocieron. */
  shapes: { circles: number; squares: number; rects: number; qr: number; base: boolean; bankCard: boolean };
}

/**
 * Traza una foto YA recortada a la pieza (con un poco de fondo alrededor). `bankCard` (fracciones
 * de la imagen) marca el recuadro de datos bancarios: queda sólo su contorno, vacío, igual que los
 * QR — el dueño pone esos datos después, en el laminador.
 */
export async function traceExact(input: Buffer, bankCard: Box | null = null): Promise<ExactTrace> {
  const meta = await sharp(input).metadata();
  const scale = WORK_SIDE / Math.max(meta.width ?? 1, meta.height ?? 1);
  const W = Math.round((meta.width ?? 1) * scale);
  const H = Math.round((meta.height ?? 1) * scale);
  const N = W * H;
  const base = sharp(input).resize(W, H, { kernel: 'lanczos3', fit: 'fill' }).flatten({ background: '#ffffff' }).toColourspace('srgb');
  const rgb = await base.clone().median(5).raw().toBuffer();
  const gray = await base.clone().greyscale().blur(1.6).raw().toBuffer();

  // Colores en Lab de toda la imagen, y agrupador (k-means + fusión de centros parecidos).
  const labPix = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) labPix.set(rgb2lab(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]), i * 3);
  const d2 = (i: number, c: number[]) => (labPix[i * 3] - c[0]) ** 2 + (labPix[i * 3 + 1] - c[1]) ** 2 + (labPix[i * 3 + 2] - c[2]) ** 2;
  const pixel = (i: number) => [labPix[i * 3], labPix[i * 3 + 1], labPix[i * 3 + 2]];
  const nearest = (i: number, cs: number[][]) => {
    let b = 0, bd = Infinity;
    for (let k = 0; k < cs.length; k++) {
      const d = d2(i, cs[k]);
      if (d < bd) { bd = d; b = k; }
    }
    return b;
  };
  /** Devuelve los K centros, a qué grupo (color final) pertenece cada uno y cuántas muestras tiene. */
  const cluster = (idx: number[]) => {
    let cents: number[][] = [pixel(idx[0])];
    while (cents.length < K) {
      let best = -1, bi = idx[0];
      for (let s2 = 0; s2 < idx.length; s2 += 5) {
        const i = idx[s2];
        let d = Infinity;
        for (const c of cents) d = Math.min(d, d2(i, c));
        if (d > best) { best = d; bi = i; }
      }
      cents.push(pixel(bi));
    }
    for (let it = 0; it < 12; it++) {
      const sum = cents.map(() => [0, 0, 0, 0]);
      for (const i of idx) {
        const s2 = sum[nearest(i, cents)];
        s2[0] += labPix[i * 3];
        s2[1] += labPix[i * 3 + 1];
        s2[2] += labPix[i * 3 + 2];
        s2[3]++;
      }
      cents = cents.map((c, k) => (sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c));
    }
    // Fusión aglomerativa: se une el par de centros más cercano mientras estén a menos de MERGE_DE
    // (une, por ejemplo, el color de transición de los bordes de una letra con el de la letra).
    const cnt = cents.map(() => 0);
    for (const i of idx) cnt[nearest(i, cents)]++;
    const group = cents.map((_, k) => k);
    const gs = cents.map((c, k) => ({ c: [...c], n: cnt[k], id: k }));
    for (;;) {
      let best: { a: number; b: number; d: number } | null = null;
      for (let a = 0; a < gs.length; a++)
        for (let b = a + 1; b < gs.length; b++) {
          const d = Math.hypot(gs[a].c[0] - gs[b].c[0], gs[a].c[1] - gs[b].c[1], gs[a].c[2] - gs[b].c[2]);
          if (d < MERGE_DE && (!best || d < best.d)) best = { a, b, d };
        }
      if (!best) break;
      const A = gs[best.a];
      const B = gs[best.b];
      const nn = A.n + B.n || 1;
      A.c = A.c.map((v, j) => (v * A.n + B.c[j] * B.n) / nn);
      A.n = nn;
      for (let k = 0; k < K; k++) if (group[k] === B.id) group[k] = A.id;
      gs.splice(best.b, 1);
    }
    return { cents, group, cnt };
  };

  // 1) Fondo: se inunda desde el borde por zonas suaves; los bordes nítidos de la pieza lo frenan.
  const strong = new Uint8Array(N);
  const grad = new Float32Array(N);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = gray[i - W + 1] + 2 * gray[i + 1] + gray[i + W + 1] - gray[i - W - 1] - 2 * gray[i - 1] - gray[i + W - 1];
      const gy = gray[i + W - 1] + 2 * gray[i + W] + gray[i + W + 1] - gray[i - W - 1] - 2 * gray[i - W] - gray[i - W + 1];
      grad[i] = Math.hypot(gx, gy) / 4;
      if (grad[i] > GRAD_T) strong[i] = 1;
    }
  // Núcleo de la placa por COLOR: el color dominante del centro de la foto es el de la placa; su
  // región conexa (con los huecos rellenos) es terreno seguro de la pieza. Sin esto, basta un
  // tramo de borde poco contrastado (o que el recorte toque la pieza) para que la inundación del
  // fondo se meta en la placa y se pierda todo el diseño.
  const core: Mask = new Uint8Array(N);
  {
    const sample: number[] = [];
    for (let y = Math.floor(H * 0.3); y < H * 0.7; y += 3) for (let x = Math.floor(W * 0.3); x < W * 0.7; x += 3) sample.push(y * W + x);
    const { cents, group, cnt } = cluster(sample);
    const total = new Map<number, number>();
    group.forEach((g, k) => total.set(g, (total.get(g) ?? 0) + cnt[k]));
    let plateGroup = group[0], bestN = -1;
    total.forEach((n2, g) => { if (n2 > bestN) { bestN = n2; plateGroup = g; } });
    // Se mide contra el centro dominante del grupo (no contra los colores de transición que se le
    // fusionaron): un mueble oscuro del fondo pegado a una placa negra no debe contar como placa.
    let main = 0, mainN = -1;
    group.forEach((g, k) => { if (g === plateGroup && cnt[k] > mainN) { mainN = cnt[k]; main = k; } });
    const key = new Int32Array(N).fill(-1);
    for (let i = 0; i < N; i++) if (grad[i] <= 12 && d2(i, cents[main]) < CORE_DE * CORE_DE) key[i] = 0;
    const { lab, comps } = label(key, W, H);
    // La región de ese color con más píxeles en la zona central.
    const votes = new Map<number, number>();
    for (const i of sample) if (lab[i] >= 0) votes.set(lab[i], (votes.get(lab[i]) ?? 0) + 1);
    let bestId = -1, bestV = 0;
    votes.forEach((v, id) => { if (v > bestV) { bestV = v; bestId = id; } });
    if (bestId >= 0) {
      const c = comps[bestId];
      const f = filledCrop(lab, W, c, 1);
      for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) core[y * W + x] = f.mask[(y - c.y0 + 1) * f.w + (x - c.x0 + 1)];
    }
  }
  const bg = new Uint8Array(N);
  const queue = new Int32Array(N);
  let head = 0, tail = 0;
  const push = (p: number) => {
    if (!bg[p] && !strong[p] && !core[p]) {
      bg[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % W;
    const y = (p / W) | 0;
    if (x > 0) push(p - 1);
    if (x < W - 1) push(p + 1);
    if (y > 0) push(p - W);
    if (y < H - 1) push(p + W);
  }
  let piece: Mask = new Uint8Array(N);
  for (let i = 0; i < N; i++) piece[i] = bg[i] ? 0 : 1;
  // Apertura grande: quita las rebabas finas que dejan los bordes del fondo.
  piece = morph(morph(piece, W, H, 14, true), W, H, 14, false);
  {
    // Componente más grande, con huecos rellenos.
    const key = new Int32Array(N);
    for (let i = 0; i < N; i++) key[i] = piece[i] ? 0 : -1;
    const { lab, comps } = label(key, W, H);
    if (comps.length === 0) throw new Error('No se pudo separar la pieza del fondo.');
    const big = comps.reduce((a, b) => (b.area > a.area ? b : a));
    const f = filledCrop(lab, W, big, 1);
    piece = new Uint8Array(N);
    for (let y = big.y0; y <= big.y1; y++)
      for (let x = big.x0; x <= big.x1; x++) piece[y * W + x] = f.mask[(y - big.y0 + 1) * f.w + (x - big.x0 + 1)];
  }
  // Ajuste al borde real: la máscara queda inflada (media banda de borde); se pela hacia adentro
  // mientras el gradiente siga subiendo, hasta quedar sobre la cresta = el borde de la pieza.
  for (let it = 0; it < 14; it++) {
    const remove: number[] = [];
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x;
        if (!piece[p]) continue;
        if (piece[p - 1] && piece[p + 1] && piece[p - W] && piece[p + W]) continue;
        let gin = 0;
        if (piece[p - 1] && grad[p - 1] > gin) gin = grad[p - 1];
        if (piece[p + 1] && grad[p + 1] > gin) gin = grad[p + 1];
        if (piece[p - W] && grad[p - W] > gin) gin = grad[p - W];
        if (piece[p + W] && grad[p + W] > gin) gin = grad[p + W];
        if (grad[p] + 0.3 < gin) remove.push(p);
      }
    if (!remove.length) break;
    for (const p of remove) piece[p] = 0;
  }
  {
    // Suavizado de la silueta (mayoría en un vecindario): quita el dentado sin mover el borde.
    const sm = await sharp(maskToRaw(piece), { raw: { width: W, height: H, channels: 1 } })
      .blur(SIL_BLUR)
      .toColourspace('b-w')
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ch = sm.info.channels;
    for (let i = 0; i < N; i++) piece[i] = sm.data[i * ch] > 127 ? 1 : 0;
  }

  // 2) Colores planos: k-means en Lab y fusión de centros parecidos.
  const idx: number[] = [];
  for (let i = 0; i < N; i += 7) if (piece[i]) idx.push(i);
  if (idx.length < 100) throw new Error('No se pudo separar la pieza del fondo.');
  const { cents, group, cnt } = cluster(idx);
  const key = new Int32Array(N).fill(-1);
  for (let i = 0; i < N; i++) if (piece[i]) key[i] = group[nearest(i, cents)];

  // Anillos de transición: entre dos colores queda una franja de 2-3 px de un color intermedio
  // (el suavizado del borde). Si el agrupador no la fusionó, forma un anillo alrededor de cada
  // letra y la letra sale hueca. Toda región así de fina se disuelve en el color vecino más parecido.
  {
    const first = label(key, W, H);
    const per = new Int32Array(first.comps.length);
    const neighbours = first.comps.map(() => new Set<number>());
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        const id = first.lab[p];
        if (id < 0) continue;
        let edge = false;
        if (x > 0) { const o = first.lab[p - 1]; if (o !== id) { edge = true; if (o >= 0) neighbours[id].add(key[p - 1]); } } else edge = true;
        if (x < W - 1) { const o = first.lab[p + 1]; if (o !== id) { edge = true; if (o >= 0) neighbours[id].add(key[p + 1]); } } else edge = true;
        if (y > 0) { const o = first.lab[p - W]; if (o !== id) { edge = true; if (o >= 0) neighbours[id].add(key[p - W]); } } else edge = true;
        if (y < H - 1) { const o = first.lab[p + W]; if (o !== id) { edge = true; if (o >= 0) neighbours[id].add(key[p + W]); } } else edge = true;
        if (edge) per[id]++;
      }
    // Centro de cada color final (promedio de sus centros, pesado por muestras).
    const centre = new Map<number, number[]>();
    const weight = new Map<number, number>();
    group.forEach((g, k) => {
      const c = centre.get(g) ?? [0, 0, 0];
      const w0 = weight.get(g) ?? 0;
      const w1 = Math.max(1, cnt[k]);
      centre.set(g, c.map((v, j) => (v * w0 + cents[k][j] * w1) / (w0 + w1)));
      weight.set(g, w0 + w1);
    });
    const target = new Int32Array(first.comps.length).fill(-2);
    first.comps.forEach((c, id) => {
      const others = [...neighbours[id]].filter((g) => g !== c.k);
      if (others.length === 0 || (2 * c.area) / Math.max(1, per[id]) >= RING_PX) return;
      target[id] = -1; // se decide píxel a píxel entre los colores vecinos
    });
    for (let p = 0; p < N; p++) {
      const id = first.lab[p];
      if (id < 0 || target[id] !== -1) continue;
      let best = key[p], bd = Infinity;
      neighbours[id].forEach((g) => {
        if (g === first.comps[id].k) return;
        const d = d2(p, centre.get(g) ?? [0, 0, 0]);
        if (d < bd) { bd = d; best = g; }
      });
      key[p] = best;
    }
  }

  // 3) Regiones y clasificación.
  const { lab, comps } = label(key, W, H);
  const shapes: Shape[] = [];
  for (const c of comps) {
    if (c.area < MIN_AREA) continue;
    const f = filledCrop(lab, W, c, 1);
    let Af = 0, sx = 0, sy = 0;
    const colSum = new Int32Array(f.w);
    const rowSum = new Int32Array(f.h);
    for (let y = 0; y < f.h; y++)
      for (let x = 0; x < f.w; x++)
        if (f.mask[y * f.w + x]) {
          Af++;
          sx += x;
          sy += y;
          colSum[x]++;
          rowSum[y]++;
        }
    // Bordes robustos: donde la proyección supera la mitad de su máximo (ignora rebabas).
    const edge = (arr: Int32Array): [number, number] => {
      let max = 0;
      for (let i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
      const t = max / 2;
      let a = 0, b = arr.length - 1;
      while (arr[a] < t) a++;
      while (arr[b] < t) b--;
      return [a, b + 1];
    };
    const [ex0, ex1] = edge(colSum);
    const [ey0, ey1] = edge(rowSum);
    const w = ex1 - ex0;
    const h = ey1 - ey0;
    const bw = c.x1 - c.x0 + 1;
    const bh = c.y1 - c.y0 + 1;
    // Grosor medio del trazo: área / (perímetro / 2). Los trazos finos (letras, líneas de íconos)
    // se dibujan rellenos en negro, con sus huecos, en vez de con doble contorno.
    let per = 0;
    for (let y = c.y0; y <= c.y1; y++)
      for (let x = c.x0; x <= c.x1; x++) {
        const p = y * W + x;
        if (lab[p] !== c.id) continue;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || lab[p - 1] !== c.id || lab[p + 1] !== c.id || lab[p - W] !== c.id || lab[p + W] !== c.id) per++;
      }
    const s: Shape = {
      c, f, Af,
      thick: (2 * c.area) / Math.max(1, per),
      holeFrac: (Af - c.area) / Af,
      x: c.x0 - 1 + ex0, y: c.y0 - 1 + ey0, w, h,
      cx: c.x0 - 1 + sx / Af, cy: c.y0 - 1 + sy / Af,
      kind: 'path', r: 0, rx: 0, square: false, solid: false,
    };
    const fill = Af / (bw * bh);
    if (bw > 24 && Math.abs(bw / bh - 1) < 0.08 && Math.abs(fill - Math.PI / 4) < 0.035) {
      s.kind = 'circle';
      s.r = Math.sqrt(Af / Math.PI);
    } else if (bw > W * 0.03 && bh > W * 0.03 && Af / (w * h) > 0.9 && w / bw > 0.95 && h / bh > 0.95) {
      // Las figuras exactas sólo aplican a elementos grandes: una letra "D" no es un rectángulo.
      s.kind = 'rect';
      s.rx = Math.sqrt(Math.max(0, w * h - Af) / (4 - Math.PI));
      if (Math.abs(w / h - 1) < 0.07) {
        s.square = true;
        const side = (w + h) / 2;
        s.x += (w - side) / 2;
        s.y += (h - side) / 2;
        s.w = s.h = side;
      }
    }
    shapes.push(s);
  }
  if (shapes.length === 0) throw new Error('No se reconoció ninguna región en la pieza.');
  // El componente más grande es la placa: su contorno es la silueta (se dibuja aparte).
  const plate = shapes.reduce((a, b) => (b.Af > a.Af ? b : a));
  // QR: cuadrado muy agujereado -> recuadro vacío; se descarta todo lo que tenga adentro.
  const qrs = shapes.filter((s) => s.square && s.holeFrac > 0.2);
  const inside = (s: Shape, r: Shape) => {
    const m = r.w * 0.06;
    return s !== r && s.cx > r.x - m && s.cx < r.x + r.w + m && s.cy > r.y - m && s.cy < r.y + r.h + m;
  };
  let keep = shapes.filter((s) => s !== plate && !qrs.some((r) => inside(s, r)));
  // Tarjeta de datos bancarios: el rectángulo exacto que coincide con el recuadro ubicado queda
  // vacío. Si ninguno coincide, igual se quita lo que haya dentro del recuadro.
  let cardEmptied = false;
  if (bankCard) {
    const bx = bankCard.x0 * W, by = bankCard.y0 * H, bw2 = (bankCard.x1 - bankCard.x0) * W, bh2 = (bankCard.y1 - bankCard.y0) * H;
    const within = (s: Shape, x: number, y: number, w: number, h: number) => s.cx > x && s.cx < x + w && s.cy > y && s.cy < y + h;
    const cardShape = keep
      .filter((s) => s.kind === 'rect' && within(s, bx, by, bw2, bh2) && s.w > bw2 * 0.6 && s.w < bw2 * 1.5 && s.h > bh2 * 0.6 && s.h < bh2 * 1.5)
      .sort((a, b) => b.Af - a.Af)[0];
    if (cardShape) keep = keep.filter((s) => s === cardShape || !(within(s, cardShape.x, cardShape.y, cardShape.w, cardShape.h) && s.Af < cardShape.Af));
    else keep = keep.filter((s) => !(within(s, bx + bw2 * 0.06, by + bh2 * 0.06, bw2 * 0.88, bh2 * 0.88) && s.Af < bw2 * bh2 * 0.5));
    cardEmptied = true;
  }
  // Igualar tamaños y alinear: cuadrados/círculos de tamaño parecido quedan idénticos y en línea.
  const snap = (list: Shape[], get: (s: Shape) => number, set: (s: Shape, v: number) => void, tol: (s: Shape) => number) => {
    const used = new Set<Shape>();
    for (const a of list) {
      if (used.has(a)) continue;
      const g = list.filter((b) => !used.has(b) && Math.abs(get(b) - get(a)) <= tol(a));
      const m = g.reduce((t, b) => t + get(b), 0) / g.length;
      g.forEach((b) => {
        set(b, m);
        used.add(b);
      });
    }
  };
  const sq = keep.filter((s) => s.square);
  const ci = keep.filter((s) => s.kind === 'circle');
  snap(sq, (s) => s.w, (s, v) => { s.x += (s.w - v) / 2; s.y += (s.h - v) / 2; s.w = s.h = v; }, (a) => a.w * 0.06);
  snap(sq, (s) => s.y, (s, v) => { s.y = v; }, (a) => a.h * 0.12);
  snap(sq, (s) => s.rx, (s, v) => { s.rx = v; }, () => 1e9);
  snap(ci, (s) => s.r, (s, v) => { s.r = v; }, (a) => a.r * 0.08);
  snap(ci, (s) => s.cy, (s, v) => { s.cy = v; }, (a) => a.r * 0.25);

  // 4) Base: en el cuarto inferior, las filas claramente más anchas que la placa -> rectángulo exacto.
  const rows: ([number, number] | null)[] = [];
  for (let y = 0; y < H; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < W; x++)
      if (piece[y * W + x]) {
        if (a < 0) a = x;
        b = x;
      }
    rows.push(a < 0 ? null : [a, b]);
  }
  const ys: number[] = [];
  rows.forEach((r, y) => { if (r) ys.push(y); });
  if (ys.length < 20) throw new Error('No se pudo separar la pieza del fondo.');
  const top = ys[0];
  const bottom = ys[ys.length - 1];
  const wOf = (y: number) => { const r = rows[y]; return r ? r[1] - r[0] : 0; };
  const widths = ys.map(wOf);
  const plateW = median(widths.slice(Math.floor(widths.length * 0.3), Math.floor(widths.length * 0.7)));
  const from = Math.floor(bottom - (bottom - top) * 0.25);
  const low: number[] = [];
  for (let y = from; y <= bottom; y++) low.push(wOf(y));
  const Wb = low.slice().sort((p, q) => p - q)[Math.floor(low.length * 0.9)];
  let yStep = bottom;
  for (let y = from; y <= bottom; y++)
    if (wOf(y) > plateW * 1.02) {
      yStep = y;
      break;
    }
  const hasBase = Wb > plateW * 1.03 && bottom - yStep > (bottom - top) * 0.01;
  let baseRect: { x: number; y: number; w: number; h: number } | null = null;
  if (hasBase) {
    const xs0: number[] = [];
    const xs1: number[] = [];
    for (let y = yStep; y <= bottom; y++) {
      const r = rows[y];
      if (r && r[1] - r[0] > Wb * 0.98) {
        xs0.push(r[0]);
        xs1.push(r[1]);
      }
    }
    if (xs0.length) baseRect = { x: median(xs0), y: yStep, w: median(xs1) - median(xs0) + 1, h: bottom - yStep + 1 };
  }
  const plateMask: Mask = new Uint8Array(N);
  const plateEnd = baseRect ? yStep : H;
  for (let y = 0; y < plateEnd; y++) for (let x = 0; x < W; x++) plateMask[y * W + x] = piece[y * W + x];

  // Bordes rectos exactos de la placa: los tramos del borde izquierdo/derecho/superior que caen
  // sobre una misma línea y son localmente rectos se alinean a esa línea; los huecos cortos entre
  // tramos alineados (rebabas del fondo) también, y los laterales se prolongan rectos hasta la base.
  {
    const M = plateMask;
    const TOL = 12;
    const straighten = (len: number, get: (a: number) => number, cut: (a: number, line: number) => void, extendEnd: boolean): number | null => {
      const prof = new Int32Array(len);
      for (let a = 0; a < len; a++) prof[a] = get(a);
      const hist = new Map<number, number>();
      let valid = 0;
      for (let a = 0; a < len; a++)
        if (prof[a] >= 0) {
          valid++;
          const bin = Math.round(prof[a] / 6);
          hist.set(bin, (hist.get(bin) ?? 0) + 1);
        }
      let bb: number | null = null, bn = 0;
      hist.forEach((n2, k2) => {
        const n3 = n2 + (hist.get(k2 - 1) ?? 0) + (hist.get(k2 + 1) ?? 0);
        if (n3 > bn) { bn = n3; bb = k2; }
      });
      if (bb === null || bn < valid * 0.25) return null;
      const near: number[] = [];
      for (let a = 0; a < len; a++) if (prof[a] >= 0 && Math.abs(prof[a] - (bb as number) * 6) <= TOL) near.push(prof[a]);
      const line = median(near);
      const on = new Uint8Array(len);
      for (let a = 8; a < len - 8; a++)
        if (prof[a] >= 0 && prof[a - 8] >= 0 && prof[a + 8] >= 0 && Math.abs(prof[a] - line) <= TOL && Math.abs(prof[a + 8] - prof[a - 8]) <= 3) on[a] = 1;
      const maxGap = Math.round(len * 0.08);
      let last = -1;
      for (let a = 0; a < len; a++)
        if (on[a]) {
          if (last >= 0 && a - last > 1 && a - last <= maxGap) for (let g = last + 1; g < a; g++) if (prof[g] >= 0) on[g] = 1;
          last = a;
        }
      if (extendEnd && last >= 0) for (let g = last + 1; g < len; g++) if (prof[g] >= 0) on[g] = 1;
      for (let a = 0; a < len; a++) if (on[a]) cut(a, line);
      return line;
    };
    const Lx = straighten(H, (y) => { for (let x = 0; x < W; x++) if (M[y * W + x]) return x; return -1; },
      (y, L) => { for (let x = 0; x < W; x++) { if (x < L) M[y * W + x] = 0; else if (M[y * W + x]) break; else M[y * W + x] = 1; } }, true);
    const Rx = straighten(H, (y) => { for (let x = W - 1; x >= 0; x--) if (M[y * W + x]) return x; return -1; },
      (y, R) => { for (let x = W - 1; x >= 0; x--) { if (x > R) M[y * W + x] = 0; else if (M[y * W + x]) break; else M[y * W + x] = 1; } }, true);
    const Ty = straighten(W, (x) => { for (let y = 0; y < H; y++) if (M[y * W + x]) return y; return -1; },
      (x, T) => { for (let y = 0; y < H; y++) { if (y < T) M[y * W + x] = 0; else if (M[y * W + x]) break; else M[y * W + x] = 1; } }, false);
    // Esquinas superiores: si el borde superior y un lateral rectos se encuentran en una esquina
    // redondeada, se reemplaza por un cuarto de círculo exacto (radio según el área que falta).
    const at = (x: number, y: number) => (x >= 0 && x < W && y >= 0 && y < H ? M[y * W + x] : 0);
    const fillet = (X: number | null, dir: 1 | -1) => {
      if (X === null || Ty === null) return;
      let dx = 0;
      while (dx < W / 3 && !at(X - dir * dx, Ty + 2)) dx++;
      let dy = 0;
      while (dy < H / 3 && !at(X - dir * 2, Ty + dy)) dy++;
      if (dx < 8 || dy < 8 || dx / dy < 0.6 || dx / dy > 1.6) return;
      const b = Math.round(1.3 * Math.max(dx, dy));
      let D = 0;
      for (let j = 0; j < b; j++) for (let i = 0; i < b; i++) if (!at(X - dir * i, Ty + j)) D++;
      const r = Math.sqrt(D / (1 - Math.PI / 4));
      if (r >= b) return;
      const ideal = (i: number, j: number) => !(i < r && j < r && Math.hypot(r - i, r - j) > r);
      let diff = 0;
      for (let j = 0; j < b; j++) for (let i = 0; i < b; i++) if (!!at(X - dir * i, Ty + j) !== ideal(i + 0.5, j + 0.5)) diff++;
      if (diff / (b * b) > 0.08) return;
      for (let j = 0; j < b; j++)
        for (let i = 0; i < b; i++) {
          const x = X - dir * i;
          const y = Ty + j;
          if (x >= 0 && x < W && y >= 0 && y < H) M[y * W + x] = ideal(i + 0.5, j + 0.5) ? 1 : 0;
        }
    };
    fillet(Rx, 1);
    fillet(Lx, -1);
    // Quita astillas finas que deja el enderezado en las esquinas entrantes.
    plateMask.set(morph(morph(plateMask, W, H, 4, true), W, H, 4, false));
  }

  // 5) SVG.
  const n = (v: number) => v.toFixed(1);
  const parts: string[] = [`<path d="${await tracePath(plateMask, W, H)}"/>`];
  if (baseRect) {
    parts.push(`<rect x="${n(baseRect.x)}" y="${n(baseRect.y)}" width="${n(baseRect.w)}" height="${n(baseRect.h)}"/>`);
    const baseY = baseRect.y;
    keep = keep.filter((s) => s.cy < baseY - 4);
  }
  // Fuera de la placa ya enderezada = resto del fondo.
  keep = keep.filter((s) => plateMask[Math.round(s.cy) * W + Math.round(s.cx)] || s.c.area > 4000);
  keep = keep.filter((s) => {
    let inP = 0, tot = 0;
    for (let y = s.c.y0; y <= s.c.y1; y += 2)
      for (let x = s.c.x0; x <= s.c.x1; x += 2)
        if (lab[y * W + x] === s.c.id) {
          tot++;
          if (plateMask[y * W + x]) inP++;
        }
    return tot > 0 && inP / tot > 0.6;
  });
  for (const s of keep) s.solid = s.kind === 'path' && s.thick < THIN * W;
  // Lo que queda encerrado en un hueco de un trazo relleno (el ojo de una "o") no se dibuja aparte.
  keep = keep.filter(
    (s) =>
      !keep.some((t) => {
        if (!t.solid || t === s || s.Af >= t.Af) return false;
        const x = Math.round(s.cx) - (t.c.x0 - 1);
        const y = Math.round(s.cy) - (t.c.y0 - 1);
        return x >= 0 && y >= 0 && x < t.f.w && y < t.f.h && Boolean(t.f.mask[y * t.f.w + x]) && s.c.x0 >= t.c.x0 && s.c.x1 <= t.c.x1 && s.c.y0 >= t.c.y0 && s.c.y1 <= t.c.y1;
      }),
  );
  keep.sort((a, b) => b.Af - a.Af);
  const count = { circles: 0, squares: 0, rects: 0, qr: qrs.length, base: Boolean(baseRect), bankCard: cardEmptied };
  for (const s of keep) {
    if (s.kind === 'circle') {
      count.circles++;
      parts.push(`<circle cx="${n(s.cx)}" cy="${n(s.cy)}" r="${n(s.r)}"/>`);
    } else if (s.kind === 'rect') {
      if (s.square) count.squares++;
      else count.rects++;
      parts.push(`<rect x="${n(s.x)}" y="${n(s.y)}" width="${n(s.w)}" height="${n(s.h)}" rx="${n(Math.min(s.rx, s.w / 2, s.h / 2))}"/>`);
    } else if (s.solid) {
      const own = new Uint8Array(s.f.w * s.f.h);
      for (let y = s.c.y0; y <= s.c.y1; y++)
        for (let x = s.c.x0; x <= s.c.x1; x++) if (lab[y * W + x] === s.c.id) own[(y - s.c.y0 + 1) * s.f.w + (x - s.c.x0 + 1)] = 1;
      const d = await tracePath(own, s.f.w, s.f.h);
      if (d) parts.push(`<path transform="translate(${s.c.x0 - 1} ${s.c.y0 - 1})" d="${d}" fill="#000" fill-rule="evenodd" stroke="none"/>`);
    } else {
      const d = await tracePath(s.f.mask, s.f.w, s.f.h);
      if (d) parts.push(`<path transform="translate(${s.c.x0 - 1} ${s.c.y0 - 1})" d="${d}"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${W + 2 * PAD} ${H + 2 * PAD}" width="${W + 2 * PAD}" height="${H + 2 * PAD}"><g fill="none" stroke="#000" stroke-width="${STROKE}" stroke-linejoin="round">${parts.join('')}</g></svg>`;
  const png = await sharp(Buffer.from(svg))
    .flatten({ background: '#ffffff' })
    .greyscale()
    .threshold(140)
    .png({ palette: true, colours: 2, compressionLevel: 9 })
    .toBuffer();

  let minX = W, maxX = 0;
  for (const r of rows)
    if (r) {
      if (r[0] < minX) minX = r[0];
      if (r[1] > maxX) maxX = r[1];
    }
  return { png, svg, ratio: (maxX - minX) / Math.max(1, bottom - top), shapes: count };
}

export interface BuildExactTraceInput {
  /** Boceto de entrada como data URL (png/jpeg/webp). */
  imageDataUrl: string;
  /** Llave y modelo de texto con visión para recortar la foto a la pieza; sin llave no se recorta. */
  apiKey?: string | null;
  textModel?: string;
}

/** Recorta la foto a la pieza (si hay llave) y la traza. No usa ningún modelo de imagen. */
export async function buildExactTrace({ imageDataUrl, apiKey, textModel }: BuildExactTraceInput): Promise<ExactTrace> {
  const match = /^data:image\/(?:png|jpeg|webp);base64,(.+)$/.exec(imageDataUrl);
  if (!match) throw new Error('La imagen del boceto no es válida.');
  const original = Buffer.from(match[1], 'base64');
  if (!apiKey || !textModel) return traceExact(original);
  const located = await locatePiece(original, { apiKey, model: textModel });
  return traceExact(located.image, located.bankCard);
}
