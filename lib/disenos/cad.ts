import OpenAI from 'openai';
import { renderScad, ScadError, type ScadRender } from './scad';

// Del boceto al STL: el modelo de texto de OpenAI (con visión) mira el boceto y escribe código
// OpenSCAD paramétrico; el código se renderiza a STL en WASM (ver scad.ts). NO es "imagen a malla"
// — sirve para piezas geométricas con medidas exactas (llaveros, placas, soportes), no para
// figuras orgánicas complejas.

const SYSTEM_PROMPT = `Sos un ingeniero de diseño para impresión 3D FDM. Recibís un boceto/mockup de un producto (una imagen de referencia, no un plano) y una descripción, y escribís código OpenSCAD que modela esa pieza para imprimirla.

Reglas del modelado:
- Unidades en milímetros. La pieza completa debe ser UN solo sólido continuo, sin partes sueltas ni flotando. Las partes que se tocan tienen que solaparse un poco (no sólo rozarse en una arista o esquina) para que la unión sea hermética.
- La pieza se apoya sobre el plano z=0 (nada por debajo de z=0) con una cara plana lo más grande posible abajo. Centrala en x e y alrededor del origen.
- El lado más largo de la pieza mide exactamente el tamaño máximo que se te indique.
- Diseñá para FDM: paredes y detalles de al menos 1.2 mm de espesor, evitá voladizos de más de 45° y huecos cerrados, agujeros pasantes (ej. de llavero) de mínimo 4 mm de diámetro y con al menos 3 mm de material alrededor.
- Priorizá que se pueda imprimir sobre la fidelidad al boceto: si un detalle del boceto es demasiado fino u orgánico para modelar con primitivas, simplificalo o omitilo. El boceto es una guía de forma y proporciones, no hay que copiarlo píxel a píxel.
- Si el boceto muestra un logo o un texto, no lo modeles con letras (no hay fuentes disponibles): dejá una zona plana o un rebaje simple donde iría, y no lo menciones como hecho.

Restricciones técnicas del intérprete:
- Sólo primitivas y operaciones estándar: cube, cylinder, sphere, polyhedron, polygon/circle/square con linear_extrude o rotate_extrude, union, difference, intersection, hull, translate, rotate, scale, mirror, for.
- PROHIBIDO: text(), import(), surface(), include, use, minkowski(). $fn como máximo 64 (usá 48 para curvas normales).
- Las dimensiones importantes van como variables al principio del archivo, con un comentario corto cada una, para que se puedan ajustar a mano.

Respuesta: sólo el código OpenSCAD completo dentro de un único bloque \`\`\`openscad, sin explicaciones fuera del bloque.`;

const MAX_OUTPUT_TOKENS = 16_000;

export interface GenerateCadInput {
  apiKey: string;
  model: string;
  /** Imagen del boceto como data URL (PNG/JPEG/WebP en base64). */
  imageDataUrl: string;
  description: string;
  maxSizeMm: number;
}

export interface CadResult extends ScadRender {
  scad: string;
}

function extractCode(text: string): string {
  const fenced = text.match(/```(?:openscad|scad)?\s*\n([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

// Avisos que indican que el modelo escribió algo mal aunque el render haya salido: vale la pena
// una segunda pasada mostrándole el aviso.
const REPAIRABLE_WARNING = /unknown module|unknown function|2-manifold|include file|can't get font|ignoring/i;

async function askForCode(client: OpenAI, model: string, input: OpenAI.Responses.ResponseInput): Promise<string> {
  const response = await client.responses.create({
    model,
    instructions: SYSTEM_PROMPT,
    input,
    max_output_tokens: MAX_OUTPUT_TOKENS,
  });
  const code = extractCode(response.output_text ?? '');
  if (!code) throw new ScadError('El modelo no devolvió código.');
  return code;
}

type Attempt = { ok: true; scad: string; render: ScadRender } | { ok: false; scad: string; error: string };

async function tryRender(scad: string): Promise<Attempt> {
  try {
    return { ok: true, scad, render: await renderScad(scad) };
  } catch (error) {
    if (error instanceof ScadError) return { ok: false, scad, error: error.message };
    throw error;
  }
}

export async function generateCadModel({ apiKey, model, imageDataUrl, description, maxSizeMm }: GenerateCadInput): Promise<CadResult> {
  const client = new OpenAI({ apiKey });

  const userMessage: OpenAI.Responses.ResponseInputItem = {
    role: 'user',
    content: [
      {
        type: 'input_text',
        text: `Descripción de la pieza: ${description.trim()}\nTamaño máximo (lado más largo): ${maxSizeMm} mm.\nModelá la pieza del boceto adjunto.`,
      },
      { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
    ],
  };

  const first = await tryRender(await askForCode(client, model, [userMessage]));
  if (first.ok && !first.render.warnings.some((w) => REPAIRABLE_WARNING.test(w))) {
    return { ...first.render, scad: first.scad };
  }

  const feedback = first.ok
    ? `El código se renderizó pero OpenSCAD avisó de problemas:\n${first.render.warnings.join('\n')}\nCorregí el código para que no haya avisos y la pieza sea un sólido hermético.`
    : `El código falló al renderizarse:\n${first.error}\nCorregí el código.`;

  const second = await tryRender(
    await askForCode(client, model, [userMessage, { role: 'assistant', content: `\`\`\`openscad\n${first.scad}\n\`\`\`` }, { role: 'user', content: feedback }]),
  );

  if (second.ok) return { ...second.render, scad: second.scad };
  if (first.ok) return { ...first.render, scad: first.scad };
  throw new ScadError(`El modelo no logró escribir un diseño válido: ${second.error}`);
}
