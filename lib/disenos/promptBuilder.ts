// Arma el prompt final que se manda al modelo de imagen. La parte fija de reglas de impresión
// FDM es la razón de ser de este módulo: ChatGPT/Gemini "a pelo" (sin este prefijo) suelen
// devolver bocetos vistosos pero con geometría irrealizable (partes flotantes, voladizos
// imposibles, huecos cerrados) — ver conversación que originó /admin/disenos.

const PRINTABILITY_RULES = [
  'Boceto/mockup de producto de impresión 3D FDM (filamento), NO un plano técnico ni un render fotorrealista de estudio.',
  'La pieza debe ser un sólido único y continuo, apoyable sobre una base plana, sin partes separadas ni flotando en el aire.',
  'Sin voladizos extremos ni geometría que necesite soporte imposible de quitar a mano.',
  'Sin huecos internos completamente cerrados (imprimibles pero inspeccionables/vaciables).',
  'Espesores de pared razonables para un objeto pequeño (llavero, figura, portaobjetos, etc.), nada ultra fino que se rompería al imprimir.',
].join(' ');

// Expositor QR/redes (el producto estrella del negocio): placa plana multicolor de capas
// (relieve de 1-2 mm sobre una placa base) con logo, íconos de redes, recuadros de QR y base.
// A diferencia de PRINTABILITY_RULES (boceto genérico), aquí se busca una FOTO realista del
// resultado impreso, como las del catálogo de referencia (xaro.com.mx/Expositor).
const EXPOSITOR_BRIEF = [
  'Fotografía realista de producto, vertical, de un expositor/soporte de mesa impreso en 3D con filamento PLA multicolor, listo para un negocio (cafetería, barbería, restaurante, estética...).',
  'Estructura: una placa vertical plana y gruesa (unos 5 mm) con silueta de contorno limpio (arco, rectángulo con esquinas redondeadas o forma temática) que se apoya de pie sobre una base plana rectangular delgada con una pequeña ranura/cuña trasera; la placa y la base forman UN solo cuerpo estable.',
  'REGLA DE ORO — colores y detalle imprimibles: cada elemento es una silueta plana de UN solo color sólido y uniforme (como filamento PLA liso), sin degradados, sin sombreado pintado, sin brillos ni texturas dibujadas, sin ilustración detallada ni realista. Paleta cerrada de 4 a 5 colores planos y saturados en total (el color de la placa, 2 o 3 de contraste y blanco/negro para los QR), reutilizados en todo el diseño: los íconos de redes llevan los colores de esa paleta, no sus colores de marca originales. Comida, objetos y mascotas se simplifican a formas gráficas básicas de 2 o 3 colores, con pocas partes grandes (tipo calcomanía o pictograma), sin detalles diminutos, sin líneas finas ni letras pequeñas: todo rasgo mide al menos 1.5 mm a escala real y las separaciones entre colores son claras y gruesas. Los textos son pocos, en tipografía gruesa y legible; evitar eslóganes en letra chica o ornamentos decorativos (estrellas, chispas, filigranas, marcos con adornos). Nada de tarjetas bancarias fotorrealistas: un recuadro plano con el texto en relieve.',
  'Técnica: impresión por capas de color — logo, letras, íconos y adornos en relieve bajo (1-2 mm) de OTRO color sobre la placa; cada elemento de un solo color liso y bien contrastado, con bordes nítidos y marcas finas de capas visibles; máximo 3 o 4 colores en total (placa, contraste, acento).',
  'Contenido, de arriba abajo: el nombre/logo del negocio en relieve bien grande; debajo una columna o fila de 2 o 3 íconos de redes sociales (Instagram, Facebook, WhatsApp, TikTok, Wi-Fi, ubicación, web, según se pida) dentro de un círculo o recuadro, cada uno junto a su recuadro cuadrado con un código QR en relieve (QR blanco y negro, legible, con margen); y en la base, en relieve, el texto «Acerca tu celular» con un pequeño ícono de celular.',
  'Puede llevar un adorno temático grande pegado al borde de la placa (mascota, tijeras, granos de café, rebanada de pizza, hoja...) como silueta plana de varios colores, siempre unido a la placa, nunca flotando.',
  'Toma: COMPLETAMENTE FRONTAL — la cámara está de frente y perpendicular a la placa, a la altura de su centro, sin ningún giro ni ángulo de tres cuartos ni perspectiva; no se ve el grosor ni los costados de la pieza, sólo su cara. La pieza es simétrica en la toma y no se deforma: los círculos se ven como círculos perfectos y los recuadros de QR como cuadrados exactos. La pieza completa (placa y base) cabe en el encuadre, centrada y con un poco de margen. Sobre una mesa blanca brillante o de madera, fondo desenfocado cálido de interior de negocio (bokeh), luz suave natural y pareja, sin reflejos fuertes ni sombras largas. Sin manos, sin personas, sin marcas de agua.',
].join(' ');

export type DesignKind = 'expositor' | 'libre';

export interface BuildDesignPromptInput {
  kind?: DesignKind;
  description: string;
  /** Cuántas imágenes de referencia (logo, ejemplos de forma/estilo...) adjuntó el usuario. */
  referenceImageCount: number;
}

export function buildDesignPrompt({ kind = 'expositor', description, referenceImageCount }: BuildDesignPromptInput): string {
  const expositor = kind === 'expositor';
  const parts = [expositor ? EXPOSITOR_BRIEF : PRINTABILITY_RULES, `Diseño pedido: ${description.trim()}.`];

  if (referenceImageCount === 1) {
    parts.push(
      'Se adjunta una imagen de referencia (puede ser un logo): si es un logo, incorporarlo de forma legible, grabado o en relieve sobre la superficie de la pieza (no como una textura o calcomanía plana que se perdería al imprimir); si es otro tipo de referencia, usarla para guiar la forma o el estilo.',
    );
  } else if (referenceImageCount > 1) {
    parts.push(
      'Se adjuntan varias imágenes de referencia (pueden incluir un logo y otras referencias de forma o estilo): si alguna es un logo, incorporarlo de forma legible, grabado o en relieve sobre la superficie de la pieza (no como una textura o calcomanía plana que se perdería al imprimir); usar el resto para guiar la forma o el estilo del diseño.',
    );
  }

  if (expositor) {
    parts.push(
      'Respetar los textos y colores pedidos; si se adjunta un logo, reproducirlo fielmente simplificado a formas planas de pocos colores. Los códigos QR son sólo ilustrativos.',
    );
  } else {
    parts.push('Mostrar la pieza desde un ángulo que deje ver su volumen y cómo se apoya, como boceto de producto, no una foto de estudio.');
  }

  return parts.join(' ');
}
