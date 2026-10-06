import type { Database } from '@/lib/database.types';
import type { AdFormatId, AdOptions, AdRecord, AdStyleId, AdTypeId } from './config';

type AdRow = Database['public']['Tables']['ad_creatives']['Row'];

export function toAdRecord(row: AdRow): AdRecord {
  return {
    id: row.id,
    type: row.ad_type as AdTypeId,
    style: row.style as AdStyleId,
    format: row.format as AdFormatId,
    productIds: row.product_ids ?? [],
    productNames: row.product_names ?? [],
    options: (row.options ?? {}) as AdOptions,
    imageUrls: row.image_urls ?? [],
    caption: row.caption,
    variants: Array.isArray(row.variants) ? (row.variants as AdRecord['variants']) : [],
    hashtags: row.hashtags ?? [],
    whatsappText: row.whatsapp_text,
    createdAt: row.created_at,
  };
}
