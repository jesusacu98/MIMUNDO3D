import { normalizeText } from '../text';
import type { LlmMessage, LlmProvider, LlmRequest, LlmStreamEvent, LlmToolCall } from './types';

// Simulación del proveedor de IA, para ver y probar todo el chat sin ANTHROPIC_API_KEY.
//
// Se comporta como el modelo real: escribe una introducción, llama a `buscar_catalogo`
// (en paralelo, contra el catálogo REAL de Supabase), luego a `mostrar_ideas` con
// tarjetas —enlazando las que coinciden con productos reales— y cierra invitando a afinar.
// Las ideas salen de un banco fijo por tema; no entiende lenguaje libre como un LLM.

interface MockIdea {
  title: string;
  description: string;
  /** Palabras que, si aparecen en el nombre de un producto del catálogo, lo enlazan a esta idea. */
  match: string[];
}

interface MockTheme {
  key: string;
  triggers: string[];
  intro: string;
  catalogQueries: string[];
  ideas: MockIdea[];
}

const THEMES: MockTheme[] = [
  {
    key: 'escritorio',
    triggers: ['escritorio', 'oficina', 'computadora', 'laptop', 'home office', 'trabajo', 'cables', 'monitor'],
    intro: '¡Qué buena idea! Un escritorio ordenado ayuda un montón a concentrarse. Estas son algunas ideas que se pueden imprimir en 3D para tu espacio de trabajo:',
    catalogQueries: ['organizador', 'porta', 'soporte'],
    ideas: [
      { title: 'Organizador de cables', description: 'Guías y clips para que los cables del monitor, cargador y teclado no queden enredados detrás del escritorio.', match: ['cable'] },
      { title: 'Portalápices y plumas', description: 'Un vasito o bandeja modular para plumas, plumones y tijeras, a la medida de tu espacio.', match: ['lapiz', 'lapices', 'pluma', 'plumas'] },
      { title: 'Soporte para celular', description: 'Base inclinada para ver notificaciones o videollamadas sin cargar el teléfono; puede llevar tu logo o nombre.', match: ['celular', 'telefono', 'movil'] },
      { title: 'Soporte elevador de monitor o laptop', description: 'Levanta la pantalla a la altura de los ojos y deja un hueco debajo para guardar el teclado.', match: ['monitor', 'laptop'] },
      { title: 'Soporte para audífonos', description: 'Un gancho o torre de escritorio para colgar los audífonos y liberar espacio.', match: ['audifono', 'audifonos'] },
      { title: 'Placa de nombre personalizada', description: 'Tu nombre y puesto en una placa de escritorio con el estilo que quieras.', match: ['placa'] },
      { title: 'Organizador modular de escritorio', description: 'Módulos que se acomodan como rompecabezas: notas, clips, memorias USB, tarjetas.', match: ['organizador', 'escritorio'] },
      { title: 'Porta tarjetas de presentación', description: 'Para tener a la mano tus tarjetas cuando llegan clientes a la oficina.', match: ['tarjeta', 'tarjetero'] },
      { title: 'Macetero mini para escritorio', description: 'Una plantita pequeña para darle vida al espacio, con base para recoger el agua.', match: ['macetero', 'maceta'] },
      { title: 'Soporte para tableta', description: 'Base estable para usar la tableta como segunda pantalla o para recetas y videollamadas.', match: ['tableta', 'tablet'] },
    ],
  },
  {
    key: 'negocio',
    triggers: ['redes sociales', 'display', 'exhibidor', 'negocio', 'tienda', 'mostrador', 'qr', 'emprendimiento', 'cafeteria', 'restaurante', 'publicidad', 'stand', 'marca', 'logo'],
    intro: '¡Perfecto! Un buen display hace que tu negocio se vea profesional y que te encuentren más fácil. Te dejo varias ideas:',
    catalogQueries: ['display', 'letrero', 'porta'],
    ideas: [
      { title: 'Display de mesa con código QR', description: 'Un atril pequeño con tu QR para que te sigan en redes o vean tu menú desde el celular.', match: ['qr', 'display'] },
      { title: 'Letrero con tu logo', description: 'Tu logotipo en relieve, para mostrador o pared, en los colores de tu marca.', match: ['letrero', 'logo'] },
      { title: 'Porta tarjetas de presentación', description: 'Para que los clientes se lleven tus datos con un diseño acorde a tu marca.', match: ['tarjeta', 'tarjetero'] },
      { title: 'Exhibidor de productos', description: 'Escalones o repisas pequeñas para lucir tus productos en el mostrador.', match: ['exhibidor', 'repisa'] },
      { title: 'Placa "Síguenos en redes"', description: 'Con los íconos de Instagram, Facebook o TikTok y tu usuario, lista para colocar en tu local.', match: ['redes', 'placa'] },
      { title: 'Soporte de menú o precios', description: 'Un atril para tu menú, lista de precios o promociones del día.', match: ['menu', 'precio'] },
      { title: 'Llaveros promocionales con tu marca', description: 'Un detalle para regalar a tus clientes; se pueden hacer en tandas.', match: ['llavero'] },
      { title: 'Dispensador o soporte de volantes', description: 'Mantiene tus folletos o cupones ordenados y a la vista.', match: ['volante', 'folleto'] },
    ],
  },
  {
    key: 'sala',
    triggers: ['sala', 'decorar', 'decoracion', 'living', 'recamara', 'cuarto', 'habitacion', 'pared', 'repisa'],
    intro: '¡Qué buena idea! Unos detalles bien elegidos cambian por completo el ambiente de una sala. Te propongo estas ideas:',
    catalogQueries: ['decoracion', 'lampara', 'maceta'],
    ideas: [
      { title: 'Macetas decorativas', description: 'Formas geométricas o de personajes, con plato integrado, para darle vida a la sala.', match: ['maceta', 'macetero'] },
      { title: 'Lámpara de litofanía', description: 'Una foto familiar que aparece al encender la luz; decora y da un ambiente cálido.', match: ['lampara', 'litofania'] },
      { title: 'Letras y números decorativos', description: 'El apellido de la familia, una palabra o una frase para colocar en repisa o pared.', match: ['letra', 'numero'] },
      { title: 'Portavelas y farolitos', description: 'Piezas con calados que proyectan sombras bonitas al encender una vela o una luz LED.', match: ['vela', 'farol'] },
      { title: 'Organizador de control remoto', description: 'Una base para el control de la tele, el aire y el decodificador, para que no se pierdan.', match: ['control', 'remoto'] },
      { title: 'Portarretratos personalizados', description: 'Marcos con formas o texturas distintas para tus fotos favoritas.', match: ['portarretrato', 'marco'] },
      { title: 'Repisas y soportes de pared', description: 'Pequeñas repisas para libros, plantas o figuras, hechas a la medida de tu espacio.', match: ['repisa', 'soporte'] },
      { title: 'Portavasos personalizados', description: 'Juego de portavasos para la mesa de centro, con iniciales o un diseño que combine con tu sala.', match: ['portavaso', 'posavaso'] },
    ],
  },
  {
    key: 'cocina',
    triggers: ['cocina', 'hogar', 'casa', 'baño', 'bano', 'especias', 'galletas', 'reposteria', 'utensilios'],
    intro: '¡Muy bien! Estas ideas ayudan a tener la casa más ordenada y con más personalidad:',
    catalogQueries: ['cortador', 'organizador', 'decoracion'],
    ideas: [
      { title: 'Cortadores de galletas personalizados', description: 'Con la forma que quieras: iniciales, personajes, figuras de temporada.', match: ['cortador', 'galleta'] },
      { title: 'Organizador de cubiertos y utensilios', description: 'Divisiones a la medida de tu cajón para que todo tenga su lugar.', match: ['cubierto', 'utensilio'] },
      { title: 'Portaespecias', description: 'Base o repisa para frascos de especias, aprovechando mejor el espacio de la cocina.', match: ['especia'] },
      { title: 'Macetas decorativas', description: 'Macetas con formas geométricas o de personajes, con plato integrado.', match: ['maceta', 'macetero'] },
      { title: 'Ganchos y colgadores', description: 'Para llaves, toallas o abrigos, con acabados lisos o con formas divertidas.', match: ['gancho', 'colgador'] },
      { title: 'Letras y números decorativos', description: 'Para pared o repisa: el nombre de la familia, el número de casa o una frase.', match: ['letra', 'numero'] },
      { title: 'Portarrollos y organizadores de baño', description: 'Soluciones pequeñas para acomodar el baño sin herramientas ni taladro.', match: ['rollo', 'baño', 'bano'] },
      { title: 'Lámpara de litofanía', description: 'Una foto que aparece al encender la luz; ideal para regalar o decorar.', match: ['lampara', 'litofania'] },
    ],
  },
  {
    key: 'regalo',
    triggers: ['regalo', 'cumpleaños', 'cumpleanos', 'fiesta', 'boda', 'evento', 'aniversario', 'bautizo', 'graduacion', 'souvenir', 'recuerdo', 'dia de', 'papa', 'mama', 'novia', 'novio', 'amigo'],
    intro: '¡Qué lindo detalle! Un regalo hecho a la medida se siente mucho más especial. Algunas ideas:',
    catalogQueries: ['llavero', 'regalo', 'personalizado'],
    ideas: [
      { title: 'Llavero con nombre o iniciales', description: 'Sencillo, económico y muy personal; se puede hacer en varios colores.', match: ['llavero'] },
      { title: 'Recuerdos para fiesta o evento', description: 'Souvenirs con el nombre y la fecha del evento, en la cantidad que necesites.', match: ['recuerdo', 'souvenir'] },
      { title: 'Topper de pastel personalizado', description: 'Con el nombre, la edad o un personaje, para darle el toque final al pastel.', match: ['topper', 'pastel'] },
      { title: 'Lámpara de litofanía con foto', description: 'Una foto especial que se revela al encender la luz. Regalo emotivo y original.', match: ['lampara', 'litofania'] },
      { title: 'Portavasos personalizados', description: 'Juego de portavasos con iniciales, escudo del equipo favorito o una frase.', match: ['portavaso', 'posavaso'] },
      { title: 'Letras decorativas', description: 'El nombre o una palabra especial para decorar un cuarto o una mesa de dulces.', match: ['letra'] },
      { title: 'Placa conmemorativa', description: 'Una fecha, una frase o un mensaje para recordar un momento importante.', match: ['placa'] },
      { title: 'Figura o busto personalizado', description: 'Modelado a partir de una foto o un personaje; ideal para coleccionistas.', match: ['figura', 'busto'] },
    ],
  },
  {
    key: 'gamer',
    triggers: ['gamer', 'gaming', 'videojuego', 'consola', 'control', 'anime', 'personaje', 'friki', 'geek', 'coleccion', 'figura', 'miniatura'],
    intro: '¡Excelente! Para gamers y fans hay muchísimo que se puede hacer en 3D:',
    catalogQueries: ['figura', 'soporte', 'llavero'],
    ideas: [
      { title: 'Soporte para control de consola', description: 'Base para dejar el control a la vista, con tu personaje o consola favorita.', match: ['control', 'consola'] },
      { title: 'Soporte de audífonos gamer', description: 'Torre o gancho para los audífonos, con logo o estilo personalizado.', match: ['audifono', 'audifonos'] },
      { title: 'Llaveros de personajes', description: 'Tus personajes favoritos en formato llavero, en varios colores.', match: ['llavero', 'personaje'] },
      { title: 'Figura o miniatura personalizada', description: 'Un personaje o modelo propio para coleccionar o pintar.', match: ['figura', 'miniatura'] },
      { title: 'Lámpara de litofanía', description: 'Una imagen del juego o anime que aparece al encender la luz.', match: ['lampara', 'litofania'] },
      { title: 'Organizador de dados y miniaturas', description: 'Para juegos de mesa o rol: bandejas, torres de dados y cajas.', match: ['dado', 'organizador'] },
    ],
  },
  {
    key: 'mascota',
    triggers: ['mascota', 'perro', 'gato', 'perrito', 'gatito', 'veterinaria'],
    intro: '¡Qué tierno! Para las mascotas también se pueden hacer cosas muy útiles y lindas:',
    catalogQueries: ['mascota', 'placa', 'llavero'],
    ideas: [
      { title: 'Placa de identificación', description: 'Con el nombre y tu teléfono, resistente y ligera para el collar.', match: ['placa'] },
      { title: 'Comedero elevado o base para platos', description: 'Ayuda a que coma mejor y evita que se riegue la comida.', match: ['comedero', 'plato'] },
      { title: 'Llavero con la carita de tu mascota', description: 'Un recuerdo personalizado con su silueta o su nombre.', match: ['llavero'] },
      { title: 'Portabolsas para paseo', description: 'Un dispensador que se sujeta a la correa para las bolsas.', match: ['bolsa'] },
      { title: 'Juguetes y figuras decorativas', description: 'Figuras con la forma de su raza para decorar o regalar.', match: ['figura', 'juguete'] },
    ],
  },
];

const FALLBACK_THEME: MockTheme = {
  key: 'general',
  triggers: [],
  intro: '¡Claro! Con lo que me cuentas se me ocurren varias ideas que se pueden imprimir en 3D:',
  catalogQueries: ['personalizado', 'organizador', 'llavero'],
  ideas: [
    { title: 'Llaveros personalizados', description: 'Con nombre, logo o personaje; una de las piezas más pedidas.', match: ['llavero'] },
    { title: 'Organizadores a la medida', description: 'Piezas diseñadas para el espacio y los objetos exactos que quieres acomodar.', match: ['organizador'] },
    { title: 'Letreros y placas', description: 'Nombres, frases o logotipos en relieve para casa o negocio.', match: ['letrero', 'placa'] },
    { title: 'Decoración personalizada', description: 'Figuras, letras o lámparas con tu estilo para darle personalidad a cualquier espacio.', match: ['decoracion', 'lampara'] },
    { title: 'Soportes y bases', description: 'Para celular, tableta, control, audífonos o lo que uses todos los días.', match: ['soporte', 'base'] },
    { title: 'Detalles para regalar', description: 'Recuerdos personalizados para cumpleaños, eventos o fechas especiales.', match: ['regalo', 'recuerdo'] },
  ],
};

const FIRST_BATCH = 6;
const NEXT_BATCH = 4;

function detectTheme(userTexts: string[]): MockTheme {
  // La última pregunta pesa más, pero si no dice nada útil se usa la conversación completa.
  for (const text of [userTexts[userTexts.length - 1], userTexts.join(' ')]) {
    const haystack = normalizeText(text ?? '');
    let best: { theme: MockTheme; hits: number } | null = null;
    for (const theme of THEMES) {
      const hits = theme.triggers.filter((t) => haystack.includes(normalizeText(t))).length;
      if (hits > 0 && (!best || hits > best.hits)) best = { theme, hits };
    }
    if (best) return best.theme;
  }
  return FALLBACK_THEME;
}

interface CatalogHit {
  id: string;
  nombre: string;
}

function parseCatalogHits(messages: LlmMessage[]): CatalogHit[] {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'tool') return [];
  const hits = new Map<string, CatalogHit>();
  for (const result of last.results) {
    if (result.name !== 'buscar_catalogo' || result.isError) continue;
    try {
      const parsed = JSON.parse(result.content) as { productos?: CatalogHit[] };
      for (const p of parsed.productos ?? []) if (p?.id && p?.nombre) hits.set(p.id, p);
    } catch {
      // resultado ilegible: se ignora, las ideas salen sin producto enlazado
    }
  }
  return Array.from(hits.values());
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });

export class MockProvider implements LlmProvider {
  readonly id = 'mock';
  readonly isDemo = true;
  private callSeq = 0;

  private nextCallId() {
    this.callSeq += 1;
    return `mock_call_${Date.now()}_${this.callSeq}`;
  }

  private async *typeOut(text: string, signal?: AbortSignal): AsyncGenerator<LlmStreamEvent> {
    // Palabra por palabra, como llega el texto de un modelo real por streaming.
    for (const chunk of text.match(/\S+\s*/g) ?? []) {
      if (signal?.aborted) return;
      yield { type: 'text', delta: chunk };
      await sleep(22, signal);
    }
  }

  async *stream(request: LlmRequest): AsyncGenerator<LlmStreamEvent> {
    const { messages, tools, signal } = request;
    const userTexts = messages.flatMap((m) => (m.role === 'user' ? [m.content] : []));
    const theme = detectTheme(userTexts);
    const canSearch = tools.some((t) => t.name === 'buscar_catalogo');
    const last = messages[messages.length - 1];
    const isFollowUp = userTexts.length > 1;

    // Ideas que toca mostrar en este turno (primer lote, o el siguiente si el cliente pide más/afina).
    const offset = isFollowUp ? FIRST_BATCH : 0;
    const batch = theme.ideas.slice(offset, offset + (isFollowUp ? NEXT_BATCH : FIRST_BATCH));

    // 1) Turno del cliente → introducción + búsquedas en el catálogo (o directo a las tarjetas).
    if (!last || last.role === 'user') {
      const intro = isFollowUp
        ? batch.length > 0
          ? 'Claro, con eso puedo afinar las ideas. Mira estas otras opciones:'
          : 'Con lo que me cuentas ya te compartí las ideas principales. Si quieres, dime más detalles (medidas, colores, si lleva tu nombre o logo) y las ajustamos.'
        : `Soy Fili, tu compañero de ideas de MiMundo3D. ${theme.intro}`; // el "real" (llm/openai.ts) se presenta igual sólo en el primer turno, ver systemPrompt.ts
      yield* this.typeOut(intro, signal);

      if (batch.length === 0) {
        yield { type: 'end', reason: 'end_turn' };
        return;
      }
      const calls: LlmToolCall[] = canSearch
        ? theme.catalogQueries.map((consulta) => ({ id: this.nextCallId(), name: 'buscar_catalogo', input: { consulta } }))
        : [this.showIdeasCall(batch, [])];
      for (const call of calls) yield { type: 'tool_call', call };
      yield { type: 'end', reason: 'tool_use' };
      return;
    }

    // 2) Resultados del catálogo → tarjetas, enlazando productos reales cuando coinciden.
    if (last.role === 'tool' && last.results.some((r) => r.name === 'buscar_catalogo')) {
      const hits = parseCatalogHits(messages);
      yield { type: 'tool_call', call: this.showIdeasCall(batch, hits) };
      yield { type: 'end', reason: 'tool_use' };
      return;
    }

    // 3) Tarjetas ya mostradas → cierre invitando a afinar.
    yield* this.typeOut(
      '¿Quieres que las afinemos? Cuéntame para cuántas personas o piezas las necesitas, qué colores te gustan o si llevarían tu nombre o logo. Guarda las que te gusten en "Mi cotización" y, cuando estés listo, las mandas por WhatsApp para que te cotice el equipo.',
      signal,
    );
    yield { type: 'end', reason: 'end_turn' };
  }

  private showIdeasCall(batch: MockIdea[], hits: CatalogHit[]): LlmToolCall {
    const used = new Set<string>();
    const ideas = batch.map((idea) => {
      const hit = hits.find(
        (h) => !used.has(h.id) && idea.match.some((keyword) => normalizeText(h.nombre).includes(normalizeText(keyword))),
      );
      if (hit) used.add(hit.id);
      return { titulo: idea.title, descripcion: idea.description, ...(hit ? { product_id: hit.id } : {}) };
    });
    return { id: this.nextCallId(), name: 'mostrar_ideas', input: { ideas } };
  }
}
