export interface SocialNetwork {
  key: string;
  label: string;
  placeholder: string;
  // Alias cortos aceptados en /r/[cliente]/[red] (además de `key`).
  aliases: string[];
  // Si el valor capturado es un @usuario, se arma la URL con este prefijo.
  handleBaseUrl?: string;
}

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  { key: 'instagram', label: 'Instagram', placeholder: '@usuario o https://instagram.com/usuario', aliases: ['ig'], handleBaseUrl: 'https://instagram.com/' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/tu-pagina', aliases: ['fb'] },
  { key: 'tiktok', label: 'TikTok', placeholder: '@usuario o https://tiktok.com/@usuario', aliases: ['tt'], handleBaseUrl: 'https://tiktok.com/@' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'Número (6691234567) o link wa.me', aliases: ['wa'] },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@canal', aliases: ['yt'] },
  { key: 'x', label: 'X (Twitter)', placeholder: '@usuario o https://x.com/usuario', aliases: ['tw', 'twitter'], handleBaseUrl: 'https://x.com/' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/...', aliases: ['in'] },
  { key: 'web', label: 'Sitio web', placeholder: 'https://sitio.com', aliases: ['sitio'] },
  { key: 'resenas', label: 'Google Reseñas', placeholder: 'https://g.page/r/.../review', aliases: ['gr', 'review'] },
  { key: 'maps', label: 'Google Maps', placeholder: 'https://maps.app.goo.gl/...', aliases: ['mapa'] },
];

export function resolveNetwork(value: string): SocialNetwork | undefined {
  const v = value.toLowerCase();
  return SOCIAL_NETWORKS.find((n) => n.key === v || n.aliases.includes(v));
}

export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

// Convierte lo que capturó el admin en una URL final válida, o devuelve un error.
export function normalizeSocialUrl(network: SocialNetwork, raw: string): { url: string } | { error: string } {
  const value = raw.trim();

  if (network.key === 'whatsapp' && /^[\d\s()+-]+$/.test(value)) {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return { error: 'El número de WhatsApp debe tener de 10 a 15 dígitos.' };
    return { url: `https://wa.me/${digits.length === 10 ? '52' + digits : digits}` };
  }

  if (network.handleBaseUrl && /^@?[\w.]+$/.test(value)) {
    return { url: network.handleBaseUrl + value.replace(/^@/, '') };
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  if (!isHttpUrl(withScheme)) return { error: `El link de ${network.label} no es una URL válida.` };
  return { url: withScheme };
}
