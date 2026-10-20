import { NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteDesignImagesIfManaged } from '@/lib/storage';

// Borra una generación del historial junto con sus imágenes.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCurrentUserAdmin())) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const { id } = await params;

  const { data } = await supabaseAdmin.from('design_history').select('image_urls, fusion_urls').eq('id', id).single();
  const { error } = await supabaseAdmin.from('design_history').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'No se pudo borrar.' }, { status: 500 });
  if (data) {
    const fusion = data.fusion_urls && typeof data.fusion_urls === 'object' ? Object.values(data.fusion_urls as Record<string, string>) : [];
    await deleteDesignImagesIfManaged([...(data.image_urls ?? []), ...fusion]);
  }
  return NextResponse.json({ ok: true });
}
