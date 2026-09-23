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
  hasLogo: boolean;
}

export function buildDesignPrompt({ description, hasLogo }: BuildDesignPromptInput): string {
  const parts = [PRINTABILITY_RULES, `Diseño pedido: ${description.trim()}.`];

  if (hasLogo) {
    parts.push(
      'Se adjunta un logo de referencia: incorporarlo de forma legible, grabado o en relieve sobre la superficie de la pieza (no como una textura o calcomanía plana que se perdería al imprimir).',
    );
  }

  parts.push('Mostrar la pieza desde un ángulo que deje ver su volumen y cómo se apoya, como boceto de producto, no una foto de estudio.');

  return parts.join(' ');
}
