import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { saveConnection } from '@/lib/social/settings';
import { listPagesFromUserToken } from '@/lib/social/meta';
import { missingPermissions } from '@/lib/social/permissions';

// Conecta la Página de Facebook y su Instagram. Recibe los datos de la app de Meta y un token de
// usuario de Graph API Explorer; el App Secret y el token de usuario se usan sólo en esta petición
// (no se guardan). Lo que se guarda es el token de la Página, que no vence.
export async function POST(request: Request) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { action?: string; appId?: string; appSecret?: string; userToken?: string; pageId?: string } | null;
  const appId = body?.appId?.trim() ?? '';
  const appSecret = body?.appSecret?.trim() ?? '';
  const userToken = body?.userToken?.trim() ?? '';
  if (!appId || !appSecret || !userToken) {
    return NextResponse.json({ error: 'Faltan el ID de la app, la clave secreta o el token.' }, { status: 400 });
  }

  let pages;
  let granted: string[];
  try {
    ({ pages, granted } = await listPagesFromUserToken({ appId, appSecret, userToken }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo hablar con Meta.' }, { status: 400 });
  }
  if (pages.length === 0) {
    return NextResponse.json(
      { error: 'Meta no devolvió ninguna Página. Revisa que al generar el token marcaste tu Página y el permiso pages_show_list.' },
      { status: 400 },
    );
  }

  if (body?.action !== 'save') {
    // Primer paso: sólo mostrar las Páginas (sin tokens) para que elija.
    return NextResponse.json({
      pages: pages.map((p) => ({ id: p.id, name: p.name, igUsername: p.igUsername })),
      missingPermissions: missingPermissions(granted),
    });
  }

  const page = pages.find((p) => p.id === body.pageId);
  if (!page) return NextResponse.json({ error: 'Elige una de las Páginas de la lista.' }, { status: 400 });

  try {
    await saveConnection({ pageId: page.id, pageName: page.name, pageToken: page.token, igUserId: page.igUserId, igUsername: page.igUsername, appId, granted });
  } catch {
    return NextResponse.json({ error: 'No se pudo guardar la conexión. ¿Corriste supabase/schema_social.sql en Supabase?' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, pageName: page.name, igUsername: page.igUsername });
}
