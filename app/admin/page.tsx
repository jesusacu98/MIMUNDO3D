import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Package, Tags, Calculator, ClipboardList, PiggyBank } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import AdminHeader from './AdminHeader';

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const percent = new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 });

export default async function AdminPage() {
  // El middleware ya protege /admin, pero se verifica también aquí
  // (defensa en profundidad) por si el matcher del middleware cambiara.
  const supabaseAuth = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: roleRow } = await supabaseAuth.from('user_roles').select('role').eq('user_id', user.id).single();
  if (roleRow?.role !== 'admin') redirect('/admin/login');

  const [{ count: productCount }, { count: categoryCount }, { data: orderItemsData }, { data: investmentsData }] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('product_categories').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('order_items').select('sale_price, cost'),
    supabaseAdmin.from('investments').select('cost'),
  ]);

  const investmentTotal = (investmentsData ?? []).reduce((sum, i) => sum + i.cost, 0);
  const salesTotal = (orderItemsData ?? []).reduce((sum, o) => sum + (o.sale_price ?? 0), 0);
  const productionCost = (orderItemsData ?? []).reduce((sum, o) => sum + (o.cost ?? 0), 0);
  const grossProfit = salesTotal - productionCost;
  const netProfit = grossProfit - investmentTotal;
  const roi = investmentTotal > 0 ? netProfit / investmentTotal : 0;

  const kpis = [
    { label: 'Inversión Total', value: currency.format(investmentTotal) },
    { label: 'Ingresos Totales', value: currency.format(salesTotal) },
    { label: 'Costes de Producción', value: currency.format(productionCost) },
    { label: 'Ganancia Bruta', value: currency.format(grossProfit) },
    { label: 'Ganancia Neta', value: currency.format(netProfit), negative: netProfit < 0 },
    { label: 'ROI', value: percent.format(roi), negative: roi < 0 },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AdminHeader email={user.email ?? ''} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-950 mb-2">Panel de Administración</h1>
        <p className="text-zinc-600 mb-10 break-all">Bienvenido, {user.email}.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="bg-white border border-zinc-200/60 rounded-2xl p-5">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className={`text-xl font-extrabold ${kpi.negative ? 'text-red-600' : 'text-zinc-950'}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl">
          <Link
            href="/admin/pedidos"
            className="block bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <ClipboardList className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-zinc-950">Pedidos</p>
            <p className="text-sm text-zinc-500">gestionar ventas y clientes →</p>
          </Link>

          <Link
            href="/admin/inversion"
            className="block bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <PiggyBank className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-zinc-950">Inversión</p>
            <p className="text-sm text-zinc-500">gastos del negocio →</p>
          </Link>

          <Link
            href="/admin/calculadora"
            className="block bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Calculator className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-zinc-950">Calculadora de costos</p>
            <p className="text-sm text-zinc-500">precio de venta sugerido →</p>
          </Link>

          <Link
            href="/admin/productos"
            className="block bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-3xl font-extrabold text-zinc-950">{productCount ?? 0}</p>
            <p className="text-sm text-zinc-500">productos en el catálogo — gestionar →</p>
          </Link>

          <Link
            href="/admin/categorias"
            className="block bg-white border border-zinc-200/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Tags className="w-6 h-6" />
            </div>
            <p className="text-3xl font-extrabold text-zinc-950">{categoryCount ?? 0}</p>
            <p className="text-sm text-zinc-500">categorías — gestionar →</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
