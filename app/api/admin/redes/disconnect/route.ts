import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { clearConnection } from '@/lib/social/settings';

export async function POST() {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  try {
    await clearConnection();
  } catch {
    return NextResponse.json({ error: 'No se pudo desconectar.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
