import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveNetwork, isHttpUrl } from '@/lib/socialNetworks';

export async function GET(request: NextRequest, { params }: { params: Promise<{ client_id: string; network: string }> }) {
  const { client_id, network } = await params;

  const home = NextResponse.redirect(new URL('/', request.url), 302);

  const networkInfo = resolveNetwork(network);
  const clientId = Number(client_id);
  if (!networkInfo || !Number.isInteger(clientId)) return home;

  const { data } = await supabaseAdmin
    .from('client_social_links')
    .select('url')
    .eq('client_id', clientId)
    .eq('network', networkInfo.key)
    .maybeSingle();

  // 302 (no 301): el admin puede cambiar el destino y los navegadores no deben cachearlo.
  if (!data || !isHttpUrl(data.url)) return home;
  return NextResponse.redirect(data.url, 302);
}
