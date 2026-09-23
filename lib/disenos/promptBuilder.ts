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

export interface BuildDesignPromptInput {
  description: string;
  /** Cuántas imágenes de referencia (logo, ejemplos de forma/estilo...) adjuntó el usuario. */
  referenceImageCount: number;
}

export function buildDesignPrompt({ description, referenceImageCount }: BuildDesignPromptInput): string {
  const parts = [PRINTABILITY_RULES, `Diseño pedido: ${description.trim()}.`];

  if (referenceImageCount === 1) {
    parts.push(
      'Se adjunta una imagen de referencia (puede ser un logo): si es un logo, incorporarlo de forma legible, grabado o en relieve sobre la superficie de la pieza (no como una textura o calcomanía plana que se perdería al imprimir); si es otro tipo de referencia, usarla para guiar la forma o el estilo.',
    );
  } else if (referenceImageCount > 1) {
    parts.push(
      'Se adjuntan varias imágenes de referencia (pueden incluir un logo y otras referencias de forma o estilo): si alguna es un logo, incorporarlo de forma legible, grabado o en relieve sobre la superficie de la pieza (no como una textura o calcomanía plana que se perdería al imprimir); usar el resto para guiar la forma o el estilo del diseño.',
    );
  }

  parts.push('Mostrar la pieza desde un ángulo que deje ver su volumen y cómo se apoya, como boceto de producto, no una foto de estudio.');

  return parts.join(' ');
}
