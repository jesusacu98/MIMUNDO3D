import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Eye, EyeOff } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { placementKey, type BannerPlacement } from '@/lib/banners';
import SubmitButton from '@/components/SubmitButton';
import DeleteBannerButton from './DeleteBannerButton';
import { deleteBanner, toggleBannerActive } from './actions';

// Etiquetas cortas para las "chips" de la tabla.
const PLACEMENT_SHORT_LABELS: Record<BannerPlacement, string> = {
  home: 'Inicio',
  catalog: 'Catálogo',
  home_category: 'Imagen en inicio',
  category_page: 'Página',
};

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminBannersPage({ searchParams }: PageProps) {
  const { error } = await searchParams;

  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const { data: bannersData, error: loadError } = await supabaseAdmin
    .from('banners')
    .select('id, title, image_url, display_order, is_active, link_url, banner_placements(placement, category_id)')
    .order('display_order', { ascending: true });

  const { data: categoriesData } = await supabaseAdmin.from('product_categories').select('id, name');
  const categoryNameById = new Map((categoriesData ?? []).map((c) => [c.id, c.name]));

  const banners = bannersData ?? [];
  // Tablas ausentes (42P01/PGRST205) o relación no encontrada (PGRST200): faltan los SQL de banners.
  const missingTable = ['42P01', 'PGRST205', 'PGRST200'].includes(loadError?.code ?? '');

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Banners</h1>
            <p className="text-zinc-600">
              {banners.length} banner(s). Sube imágenes y elige en qué secciones se muestra cada una (puede ser en varias a la vez): inicio, catálogo, imagen de cada categoría en el inicio o página de cada categoría. Los cambios se ven en el sitio en menos de un minuto.
            </p>
          </div>
          <Link
            href="/admin/banners/nueva"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark hover:brightness-95 text-white font-semibold text-sm shadow-md shadow-primary/20 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Agregar banner
          </Link>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</p>}
        {missingTable && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
            Faltan las tablas de banners: ejecuta <code>supabase/schema_catalog_v6.sql</code> y luego <code>supabase/schema_catalog_v7.sql</code> en el SQL Editor de Supabase.
          </p>
        )}

        <div className="bg-white border border-zinc-200/60 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3" />
                <th className="text-left px-5 py-3 font-semibold">Nombre</th>
                <th className="text-left px-5 py-3 font-semibold">Secciones</th>
                <th className="text-left px-5 py-3 font-semibold">Orden</th>
                <th className="text-left px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3" />
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {banners.map((banner) => (
                <tr key={banner.id} className="hover:bg-zinc-50/60">
                  <td className="pl-5 py-3">
                    <div className="w-24 aspect-[3/1] rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={banner.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-zinc-900">{banner.title}</p>
                    {banner.link_url && <p className="text-xs text-zinc-500 truncate max-w-[220px]">→ {banner.link_url}</p>}
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                      {banner.banner_placements.length === 0 && <span className="text-xs text-zinc-400">Sin secciones</span>}
                      {banner.banner_placements.map((p) => (
                        <span
                          key={placementKey(p.placement, p.category_id)}
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-[11px] font-medium text-zinc-600"
                        >
                          {PLACEMENT_SHORT_LABELS[p.placement]}
                          {p.category_id ? ` · ${categoryNameById.get(p.category_id) ?? '—'}` : ''}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">{banner.display_order}</td>
                  <td className="px-5 py-3">
                    <form action={toggleBannerActive.bind(null, banner.id, !banner.is_active)}>
                      <SubmitButton
                        aria-label={banner.is_active ? `Ocultar ${banner.title}` : `Mostrar ${banner.title}`}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${
                          banner.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                        }`}
                      >
                        {banner.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {banner.is_active ? 'Visible' : 'Oculto'}
                      </SubmitButton>
                    </form>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/banners/${banner.id}/editar`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <DeleteBannerButton bannerTitle={banner.title} action={deleteBanner.bind(null, banner.id)} />
                  </td>
                </tr>
              ))}
              {banners.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-zinc-500">
                    Todavía no hay banners.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
