import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Nota de pedido para mandar al cliente (PDF vectorial con el logo y los colores de la marca).
// Nunca muestra costos ni ganancia: sólo lo que el cliente necesita ver.

export interface TicketItem {
  /** Lo que se le muestra al cliente (la descripción para el cliente, o el nombre del producto si no hay). */
  name: string;
  quantity: number;
  /** Importe de la línea (precio total de ese producto). */
  price: number;
}

export interface TicketData {
  /** Folio corto para identificar la nota. */
  folio: string;
  clientName: string;
  orderDate: string | null;
  deliveryDate: string | null;
  items: TicketItem[];
  total: number;
  /** Lo que ya pagó el cliente (anticipo, o el total si ya está pagado). */
  paid: number;
  /** % del total que representa lo pagado, redondeado; 0 si no hay anticipo. */
  paidPercent: number;
  remaining: number;
  settled: boolean;
}

/** Totales a partir de las líneas y los datos de pago del pedido (misma regla que el resumen de /admin/pedidos). */
export function computeTicketPayment(items: TicketItem[], paymentStatus: string | null, advance: number | null) {
  const total = Math.round(items.reduce((sum, i) => sum + i.price, 0) * 100) / 100;
  const paid = paymentStatus === 'Pagado' ? total : Math.min(Math.max(advance ?? 0, 0), total);
  const remaining = Math.round((total - paid) * 100) / 100;
  const paidPercent = total > 0 && paid > 0 ? Math.round((paid / total) * 100) : 0;
  return { total, paid, remaining, paidPercent, settled: total > 0 && remaining <= 0 };
}

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

function longDate(dateStr: string | null): string {
  if (!dateStr) return 'Por confirmar';
  const date = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return 'Por confirmar';
  const text = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const NOTE =
  'Cada pedido se elabora especialmente para ti, pieza por pieza, y la fecha de entrega es una fecha estimada. ' +
  'Si surge algún imprevisto (por ejemplo ajustes al diseño o retrasos en materiales), podría extenderse unos días más. ' +
  'Si eso llegara a pasar, te avisaremos con tiempo y haremos todo lo posible por entregarte lo antes posible. ' +
  'Gracias por tu confianza y tu paciencia.';

const PINK = rgb(0xf3 / 255, 0x4c / 255, 0x91 / 255);
const PINK_DARK = rgb(0xd6 / 255, 0x39 / 255, 0x7a / 255);
const PINK_SOFT = rgb(0xfd / 255, 0xea / 255, 0xf2 / 255);
const LINE = rgb(0xf4 / 255, 0xd4 / 255, 0xe2 / 255);
const INK = rgb(0x27 / 255, 0x27 / 255, 0x2a / 255);
const MUTED = rgb(0x71 / 255, 0x71 / 255, 0x7a / 255);
const WHITE = rgb(1, 1, 1);

const PAGE_W = 612; // carta
const MIN_PAGE_H = 792;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LOGO_RATIO = 997 / 122;

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        // Palabra más larga que el renglón: se parte por caracteres.
        let rest = word;
        while (font.widthOfTextAtSize(rest, size) > maxWidth) {
          let cut = rest.length - 1;
          while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
          lines.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
      }
    }
    lines.push(line);
  }
  return lines;
}

// Rectángulo redondeado como path SVG (pdf-lib no trae radio en drawRectangle). Las coordenadas
// de drawSvgPath van con Y hacia abajo desde el origen que se le pasa.
function roundedPath(w: number, h: number, r: number): string {
  return `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
}

/** Genera la nota como PDF. Si el contenido no cabe en una carta, la hoja crece en vez de partirse en páginas. */
export async function renderOrderTicketPdf(data: TicketData): Promise<Uint8Array> {
  const dir = process.cwd();
  const [medium, bold, extraBold, logoBytes] = await Promise.all([
    readFile(path.join(dir, 'assets', 'fonts', 'Poppins-Medium.ttf')),
    readFile(path.join(dir, 'assets', 'fonts', 'Poppins-Bold.ttf')),
    readFile(path.join(dir, 'assets', 'fonts', 'Poppins-ExtraBold.ttf')),
    readFile(path.join(dir, 'public', 'logo.png')),
  ]);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fMedium = await pdf.embedFont(medium, { subset: true });
  const fBold = await pdf.embedFont(bold, { subset: true });
  const fExtra = await pdf.embedFont(extraBold, { subset: true });
  const logo = await pdf.embedPng(logoBytes);
  pdf.setTitle(`Nota de pedido ${data.folio}`);
  pdf.setAuthor('MIMUNDO3D');

  const FOOTER_H = 46;

  // `page` null = sólo medir (devuelve el alto que ocupa el contenido); con página = dibujar.
  function layout(page: PDFPage | null, pageH: number): number {
    let y = 0; // distancia desde arriba
    const py = (fromTop: number) => pageH - fromTop;
    const text = (s: string, x: number, baseline: number, font: PDFFont, size: number, color = INK) => {
      page?.drawText(s, { x, y: py(baseline), font, size, color });
    };
    const right = (s: string, xRight: number, baseline: number, font: PDFFont, size: number, color = INK) => {
      text(s, xRight - font.widthOfTextAtSize(s, size), baseline, font, size, color);
    };
    const box = (x: number, top: number, w: number, h: number, r: number, opts: { fill?: typeof PINK; border?: typeof PINK; borderWidth?: number }) => {
      page?.drawSvgPath(roundedPath(w, h, r), { x, y: py(top), color: opts.fill, borderColor: opts.border, borderWidth: opts.borderWidth });
    };

    // Banda superior
    page?.drawRectangle({ x: 0, y: py(12), width: PAGE_W, height: 12, color: PINK });
    y = 12 + 30;

    // Logo + giro
    const logoW = 200;
    const logoH = logoW / LOGO_RATIO;
    page?.drawImage(logo, { x: MARGIN, y: py(y + logoH), width: logoW, height: logoH });
    y += logoH + 16;
    text('Impresión 3D personalizada · MIMUNDO3D', MARGIN, y, fMedium, 10.5, MUTED);
    y += 34;

    // Título + folio
    text('Nota de pedido', MARGIN, y + 8, fExtra, 25, PINK_DARK);
    const folioText = `Folio ${data.folio}`;
    const folioW = fBold.widthOfTextAtSize(folioText, 11) + 24;
    box(PAGE_W - MARGIN - folioW, y - 12, folioW, 26, 13, { fill: PINK_SOFT });
    text(folioText, PAGE_W - MARGIN - folioW + 12, y + 5, fBold, 11, PINK_DARK);
    y += 38;

    // Datos generales
    const infoRows: [string, string][] = [
      ['Cliente', data.clientName],
      ['Fecha del pedido', longDate(data.orderDate)],
      ['Entrega estimada', longDate(data.deliveryDate)],
    ];
    for (const [label, value] of infoRows) {
      y += 20;
      text(label, MARGIN, y, fMedium, 12, MUTED);
      right(value, PAGE_W - MARGIN, y, fBold, 12.5);
    }
    y += 30;

    // Productos
    text('TU PEDIDO', MARGIN, y, fExtra, 10.5, PINK);
    y += 8;
    page?.drawLine({ start: { x: MARGIN, y: py(y) }, end: { x: PAGE_W - MARGIN, y: py(y) }, thickness: 1.5, color: PINK });
    const priceColW = 90;
    for (const item of data.items) {
      const label = `${item.quantity > 1 ? `${item.quantity} × ` : ''}${item.name}`;
      const lines = wrap(label, fMedium, 12, CONTENT_W - priceColW - 16);
      const rowTop = y;
      y += 22;
      lines.forEach((line, i) => text(line, MARGIN, y + i * 16, fMedium, 12));
      right(money.format(item.price), PAGE_W - MARGIN, rowTop + 22, fBold, 12);
      y += (lines.length - 1) * 16 + 12;
      page?.drawLine({ start: { x: MARGIN, y: py(y) }, end: { x: PAGE_W - MARGIN, y: py(y) }, thickness: 0.8, color: LINE });
    }
    y += 22;

    // Totales
    const totalsH = 118;
    box(MARGIN, y, CONTENT_W, totalsH, 14, { fill: PINK_SOFT });
    const inner = MARGIN + 18;
    const innerRight = PAGE_W - MARGIN - 18;
    text('Total del pedido', inner, y + 30, fMedium, 12.5, MUTED);
    right(money.format(data.total), innerRight, y + 30, fBold, 12.5);
    const paidLabel = data.paidPercent > 0 ? `${data.settled ? 'Pagado' : 'Anticipo'} (${data.paidPercent}%)` : 'Anticipo';
    text(paidLabel, inner, y + 54, fMedium, 12.5, MUTED);
    right(money.format(data.paid), innerRight, y + 54, fBold, 12.5);
    page?.drawLine({ start: { x: inner, y: py(y + 68) }, end: { x: innerRight, y: py(y + 68) }, thickness: 1, color: LINE });
    text(data.settled ? 'Pedido liquidado' : 'Resta por liquidar', inner, y + 96, fExtra, 17, PINK_DARK);
    right(money.format(data.settled ? 0 : data.remaining), innerRight, y + 96, fExtra, 17, PINK_DARK);
    y += totalsH + 20;

    // Nota sobre la fecha de entrega
    const noteLines = wrap(NOTE, fMedium, 10.5, CONTENT_W - 36);
    const noteH = 20 + 22 + noteLines.length * 15 + 14;
    box(MARGIN, y, CONTENT_W, noteH, 14, { border: LINE, borderWidth: 1.5 });
    text('Sobre la fecha de entrega', inner, y + 28, fExtra, 11.5, PINK_DARK);
    noteLines.forEach((line, i) => text(line, inner, y + 50 + i * 15, fMedium, 10.5));
    y += noteH + 28;

    // Pie rosa pegado al borde inferior de la hoja
    page?.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: FOOTER_H, color: PINK });
    if (page) {
      const thanks = '¡Gracias por tu pedido!';
      page.drawText(thanks, { x: (PAGE_W - fExtra.widthOfTextAtSize(thanks, 14)) / 2, y: FOOTER_H / 2 - 5, font: fExtra, size: 14, color: WHITE });
    }
    return y + FOOTER_H;
  }

  const needed = layout(null, MIN_PAGE_H);
  const pageH = Math.max(MIN_PAGE_H, Math.ceil(needed));
  const page = pdf.addPage([PAGE_W, pageH]);
  layout(page, pageH);
  return pdf.save();
}
