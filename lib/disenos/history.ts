import sharp from 'sharp';
import type { Database } from '@/lib/database.types';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteDesignImagesIfManaged, uploadDesignImage } from '@/lib/storage';

type DesignRow = Database['public']['Tables']['design_history']['Row'];

/** Una generación guardada en el historial (fila de `design_history`). */
export interface DesignRecord {
  id: string;
  kind: 'expositor' | 'libre';
  description: string;
  model: string;
  imageUrls: string[];
  /** PNG para Fusion por variante; la clave es el índice del boceto. */
  fusionUrls: Record<string, string>;
  createdAt: string;
}

export function toDesignRecord(row: DesignRow): DesignRecord {
  const fusion = row.fusion_urls && typeof row.fusion_urls === 'object' && !Array.isArray(row.fusion_urls) ? row.fusion_urls : {};
  return {
    id: row.id,
    kind: row.kind === 'libre' ? 'libre' : 'expositor',
    description: row.description,
    model: row.model,
    imageUrls: row.image_urls ?? [],
    fusionUrls: fusion as Record<string, string>,
    createdAt: row.created_at,
  };
}

/**
 * Guarda una generación: sube los bocetos (como JPEG, pesan ~10 veces menos que el PNG original)
 * y crea la fila. Si algo falla devuelve null y limpia lo subido: el llamador sigue pudiendo
 * mostrar las imágenes en memoria, sólo que sin historial.
 */
export async function saveDesign(input: {
  kind: 'expositor' | 'libre';
  description: string;
  model: string;
  /** Bocetos como data URL PNG en base64. */
  images: string[];
}): Promise<DesignRecord | null> {
  const uploaded: string[] = [];
  try {
    const jpegs = await Promise.all(
      input.images.map((src) =>
        sharp(Buffer.from(src.slice(src.indexOf(',') + 1), 'base64')).jpeg({ quality: 88, mozjpeg: true }).toBuffer(),
      ),
    );
    const baseName = `${input.kind}-${input.description.slice(0, 30)}`;
    for (let i = 0; i < jpegs.length; i++) {
      const result = await uploadDesignImage(jpegs[i], `${baseName}-${i + 1}`, 'jpg');
      if ('error' in result) throw new Error(result.error);
      uploaded.push(result.url);
    }

    const { data, error } = await supabaseAdmin
      .from('design_history')
      .insert({ kind: input.kind, description: input.description, model: input.model, image_urls: uploaded })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'sin fila');
    return toDesignRecord(data);
  } catch (error) {
    console.error('[disenos] No se pudo guardar en el historial (¿corriste supabase/schema_disenos.sql?):', error);
    await deleteDesignImagesIfManaged(uploaded);
    return null;
  }
}

/**
 * Agrega una variante modificada al final de una generación existente (el índice nuevo es el largo
 * anterior, así los PNG para Fusion de las demás siguen apuntando a su boceto). Devuelve el registro
 * actualizado, o null si no se pudo.
 */
export async function appendDesignImage(designId: string, imageDataUrl: string, label: string): Promise<DesignRecord | null> {
  let uploadedUrl: string | null = null;
  try {
    const { data: row } = await supabaseAdmin.from('design_history').select('*').eq('id', designId).single();
    if (!row) return null;

    const jpeg = await sharp(Buffer.from(imageDataUrl.slice(imageDataUrl.indexOf(',') + 1), 'base64'))
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
    const result = await uploadDesignImage(jpeg, `${row.kind}-mod-${label.slice(0, 30)}`, 'jpg');
    if ('error' in result) throw new Error(result.error);
    uploadedUrl = result.url;

    const { data, error } = await supabaseAdmin
      .from('design_history')
      .update({ image_urls: [...(row.image_urls ?? []), result.url] })
      .eq('id', designId)
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'sin fila');
    return toDesignRecord(data);
  } catch (error) {
    console.error('[disenos] No se pudo guardar la modificación en el historial:', error);
    if (uploadedUrl) await deleteDesignImagesIfManaged([uploadedUrl]);
    return null;
  }
}

/** Guarda el PNG para Fusion de una variante en su generación. Devuelve la URL, o null si no se pudo. */
export async function saveFusionImage(designId: string, index: number, pngBase64: string): Promise<string | null> {
  try {
    const { data: row } = await supabaseAdmin.from('design_history').select('fusion_urls').eq('id', designId).single();
    if (!row) return null;
    const current = (row.fusion_urls && typeof row.fusion_urls === 'object' ? row.fusion_urls : {}) as Record<string, string>;

    const result = await uploadDesignImage(Buffer.from(pngBase64, 'base64'), `fusion-${index + 1}`, 'png');
    if ('error' in result) throw new Error(result.error);

    const { error } = await supabaseAdmin
      .from('design_history')
      .update({ fusion_urls: { ...current, [String(index)]: result.url } })
      .eq('id', designId);
    if (error) {
      await deleteDesignImagesIfManaged([result.url]);
      throw new Error(error.message);
    }
    // La versión anterior (si se volvió a preparar) ya no se referencia.
    if (current[String(index)]) await deleteDesignImagesIfManaged([current[String(index)]]);
    return result.url;
  } catch (error) {
    console.error('[disenos] No se pudo guardar la imagen para Fusion:', error);
    return null;
  }
}
