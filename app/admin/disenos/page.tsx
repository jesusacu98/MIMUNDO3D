import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { toDesignRecord } from '@/lib/disenos/history';
import DisenosForm from './DisenosForm';

const HISTORY_LIMIT = 30;

export default async function DisenosPage() {
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  // Si la tabla aún no existe (no se corrió schema_disenos.sql) el generador funciona igual, pero
  // avisa que no se guardará nada.
  const { data: historyRows, error: historyError } = await supabaseAdmin
    .from('design_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Generador de diseños</h1>
          <p className="text-zinc-600">
            Describí qué querés diseñar (ej. &quot;llavero con forma de gato&quot;), sumá un logo si aplica, y generá bocetos de
            referencia pensados para ser imprimibles en FDM. Cuando uno te guste, &quot;Generar STL&quot; lo modela como código
            OpenSCAD con medidas exactas (mejor para piezas geométricas que para figuras orgánicas).
          </p>
        </div>

        <DisenosForm initialHistory={(historyRows ?? []).map(toDesignRecord)} historyMissing={Boolean(historyError)} />
      </main>
    </div>
  );
}
