// Ejemplos que se ofrecen como atajos en /ideas y en la sección de la home. Van escritos como los
// diría un cliente (un problema o algo que quiere lograr), para que se entienda qué se le puede pedir
// al asistente.
export const EXAMPLE_PROMPTS = [
  'Quiero ordenar mi escritorio',
  'Quiero decorar mi sala',
  'Necesito un display para mis redes sociales',
  'Busco un regalo para mi papá',
  'Quiero organizar mi cocina',
  'Voy a hacer una fiesta de cumpleaños',
] as const;

/** Enlace a /ideas que arranca la conversación con ese texto. */
export function ideasHrefFor(prompt: string): string {
  return `/ideas?q=${encodeURIComponent(prompt)}`;
}
