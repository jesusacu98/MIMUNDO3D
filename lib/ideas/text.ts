/** Minúsculas y sin acentos, para comparar texto en español de forma tolerante. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const STOPWORDS = new Set([
  'para', 'con', 'que', 'una', 'uno', 'unos', 'unas', 'los', 'las', 'del', 'mis', 'por', 'como', 'mas',
  'quiero', 'necesito', 'busco', 'algo', 'cosas', 'ideas', 'idea', 'tipo', 'muy', 'mucho', 'poco', 'esta',
  'este', 'estos', 'estas', 'tengo', 'tiene', 'donde', 'cuando', 'sobre', 'entre', 'desde', 'hacia',
  'pero', 'sin', 'les', 'nos', 'mio', 'mia', 'tus', 'sus', 'hay', 'ser', 'son', 'fue', 'era',
]);

/**
 * Palabras clave de una consulta: normalizadas, sin palabras vacías y con un
 * "singular" tosco para que "llaveros" encuentre "llavero" y "organizadores" encuentre "organizador".
 */
export function keywordsOf(query: string): string[] {
  const words = normalizeText(query)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  const stems = words.map((w) => {
    if (w.length > 5 && w.endsWith('es')) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
    return w;
  });
  return Array.from(new Set(stems));
}
