// Cliente mínimo de la Graph API de Meta para publicar los anuncios en la Página de Facebook y
// en Instagram. Sólo usa `fetch`, sin SDK. Verificado contra developers.facebook.com
// (2026-10-07): Instagram exige imágenes JPEG en una URL pública, un carrusel admite hasta 10
// imágenes y cuenta como una sola publicación (tope de 100 publicaciones por API cada 24 h);
// las historias de Instagram usan media_type=STORIES y las de la Página /photo_stories.

const GRAPH_VERSION = 'v25.0';
// Sólo para pruebas locales contra un servidor de Meta simulado (mismo criterio que OPENAI_BASE_URL).
const GRAPH = (process.env.META_GRAPH_BASE_URL?.trim() || 'https://graph.facebook.com') + '/' + GRAPH_VERSION;

export class MetaError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
    this.name = 'MetaError';
  }
}

async function graph<T>(path: string, params: Record<string, string | undefined>, method: 'GET' | 'POST' = 'POST'): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.set(k, v);

  const response =
    method === 'GET'
      ? await fetch(`${GRAPH}${path}?${body}`)
      : await fetch(`${GRAPH}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });

  const json = (await response.json().catch(() => ({}))) as { error?: { message?: string; code?: number; error_user_msg?: string }; [k: string]: unknown };
  if (!response.ok || json.error) {
    const e = json.error;
    throw new MetaError(e?.error_user_msg || e?.message || `Meta respondió ${response.status}.`, e?.code);
  }
  return json as T;
}

// ---------------------------------------------------------------------------------------------
// Conexión: token de usuario → token de la Página (que no vence)
// ---------------------------------------------------------------------------------------------

export interface MetaPage {
  id: string;
  name: string;
  token: string;
  igUserId: string | null;
  igUsername: string | null;
}

/**
 * Cambia el token de usuario de corta duración (el de Graph API Explorer) por uno de larga
 * duración y devuelve las Páginas que administra, cada una con su propio token y su cuenta de
 * Instagram vinculada. Los tokens de Página obtenidos así no vencen.
 */
export async function listPagesFromUserToken(input: { appId: string; appSecret: string; userToken: string }): Promise<{ pages: MetaPage[]; granted: string[] }> {
  const long = await graph<{ access_token: string }>(
    '/oauth/access_token',
    { grant_type: 'fb_exchange_token', client_id: input.appId, client_secret: input.appSecret, fb_exchange_token: input.userToken },
    'GET',
  );

  // Permisos que realmente tiene el token (para explicar por qué no aparece Instagram, si pasa).
  const perms = await graph<{ data: { permission: string; status: string }[] }>('/me/permissions', { access_token: long.access_token }, 'GET').catch(
    () => ({ data: [] as { permission: string; status: string }[] }),
  );
  const granted = (perms.data ?? []).filter((p) => p.status === 'granted').map((p) => p.permission);

  type IgField = { id: string; username?: string };
  const pages = await graph<{ data: { id: string; name: string; access_token: string; instagram_business_account?: IgField; connected_instagram_account?: IgField }[] }>(
    '/me/accounts',
    {
      fields: 'id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}',
      limit: '100',
      access_token: long.access_token,
    },
    'GET',
  );

  const result: MetaPage[] = [];
  for (const p of pages.data ?? []) {
    let ig: IgField | undefined = p.instagram_business_account ?? p.connected_instagram_account;
    if (!ig) {
      // Segundo intento: preguntarle a la propia Página con su token (a veces /me/accounts no lo trae).
      const detail = await graph<{ instagram_business_account?: IgField; connected_instagram_account?: IgField }>(
        `/${p.id}`,
        { fields: 'instagram_business_account{id,username},connected_instagram_account{id,username}', access_token: p.access_token },
        'GET',
      ).catch(() => null);
      ig = detail?.instagram_business_account ?? detail?.connected_instagram_account;
    }
    result.push({ id: p.id, name: p.name, token: p.access_token, igUserId: ig?.id ?? null, igUsername: ig?.username ?? null });
  }
  return { pages: result, granted };
}

export interface TokenInfo {
  isValid: boolean;
  /** 0 = el token no vence. */
  expiresAt: number;
  /** Fecha (segundos Unix) hasta la que Meta permite el acceso a los datos sin volver a autorizar la app (~90 días). */
  dataAccessExpiresAt: number | null;
}

/** Pregunta a Meta si el token sigue siendo válido y cuándo vence el acceso a datos (no necesita el App Secret). */
export async function inspectToken(token: string): Promise<TokenInfo> {
  const res = await graph<{ data: { is_valid?: boolean; expires_at?: number; data_access_expires_at?: number } }>(
    '/debug_token',
    { input_token: token, access_token: token },
    'GET',
  );
  return { isValid: res.data.is_valid !== false, expiresAt: res.data.expires_at ?? 0, dataAccessExpiresAt: res.data.data_access_expires_at ?? null };
}

// ---------------------------------------------------------------------------------------------
// Facebook (Página)
// ---------------------------------------------------------------------------------------------

export interface Published {
  id: string;
  url: string | null;
}

/** Una foto, o varias en una sola publicación (se suben sin publicar y luego se adjuntan). */
export async function publishFacebookPhotos(input: { pageId: string; token: string; imageUrls: string[]; caption: string }): Promise<Published> {
  const { pageId, token, imageUrls, caption } = input;

  if (imageUrls.length === 1) {
    const photo = await graph<{ id: string; post_id?: string }>(`/${pageId}/photos`, { url: imageUrls[0], caption, access_token: token });
    const postId = photo.post_id ?? photo.id;
    return { id: postId, url: `https://www.facebook.com/${postId}` };
  }

  const ids: string[] = [];
  for (const url of imageUrls) {
    const photo = await graph<{ id: string }>(`/${pageId}/photos`, { url, published: 'false', access_token: token });
    ids.push(photo.id);
  }
  const attached: Record<string, string> = {};
  ids.forEach((id, i) => {
    attached[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
  });
  const post = await graph<{ id: string }>(`/${pageId}/feed`, { message: caption, ...attached, access_token: token });
  return { id: post.id, url: `https://www.facebook.com/${post.id}` };
}

/** Historia de la Página con una imagen (se sube sin publicar y luego se publica como historia). */
export async function publishFacebookStory(input: { pageId: string; token: string; imageUrl: string }): Promise<Published> {
  const { pageId, token, imageUrl } = input;
  const photo = await graph<{ id: string }>(`/${pageId}/photos`, { url: imageUrl, published: 'false', access_token: token });
  const story = await graph<{ post_id?: string; success?: boolean }>(`/${pageId}/photo_stories`, { photo_id: photo.id, access_token: token });
  return { id: story.post_id ?? photo.id, url: story.post_id ? `https://www.facebook.com/${story.post_id}` : null };
}

// ---------------------------------------------------------------------------------------------
// Instagram
// ---------------------------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 45_000;

async function waitForContainer(containerId: string, token: string): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < POLL_TIMEOUT_MS) {
    const status = await graph<{ status_code?: string; status?: string }>(`/${containerId}`, { fields: 'status_code,status', access_token: token }, 'GET');
    if (status.status_code === 'FINISHED' || status.status_code === undefined) return;
    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new MetaError(`Instagram no pudo procesar la imagen (${status.status ?? status.status_code}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new MetaError('Instagram tardó demasiado en procesar la imagen. Inténtalo de nuevo en un momento.');
}

async function publishContainer(igUserId: string, token: string, containerId: string): Promise<Published> {
  await waitForContainer(containerId, token);
  const media = await graph<{ id: string }>(`/${igUserId}/media_publish`, { creation_id: containerId, access_token: token });
  const info = await graph<{ permalink?: string }>(`/${media.id}`, { fields: 'permalink', access_token: token }, 'GET').catch(() => ({} as { permalink?: string }));
  return { id: media.id, url: info.permalink ?? null };
}

/** Publicación con una imagen o carrusel (2 a 10). Las imágenes tienen que ser JPEG en una URL pública. */
export async function publishInstagramPost(input: { igUserId: string; token: string; imageUrls: string[]; caption: string }): Promise<Published> {
  const { igUserId, token, imageUrls, caption } = input;

  if (imageUrls.length === 1) {
    const container = await graph<{ id: string }>(`/${igUserId}/media`, { image_url: imageUrls[0], caption, access_token: token });
    return publishContainer(igUserId, token, container.id);
  }

  const children: string[] = [];
  for (const url of imageUrls) {
    const child = await graph<{ id: string }>(`/${igUserId}/media`, { image_url: url, is_carousel_item: 'true', access_token: token });
    children.push(child.id);
  }
  for (const id of children) await waitForContainer(id, token);
  const carousel = await graph<{ id: string }>(`/${igUserId}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption, access_token: token });
  return publishContainer(igUserId, token, carousel.id);
}

/** Historia de Instagram con una imagen (las historias no llevan descripción). */
export async function publishInstagramStory(input: { igUserId: string; token: string; imageUrl: string }): Promise<Published> {
  const { igUserId, token, imageUrl } = input;
  const container = await graph<{ id: string }>(`/${igUserId}/media`, { image_url: imageUrl, media_type: 'STORIES', access_token: token });
  return publishContainer(igUserId, token, container.id);
}
