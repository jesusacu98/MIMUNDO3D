import { createServerSupabaseClient } from '@/lib/supabase/server';
import AdminSidebar from './AdminSidebar';
import { signOutAction } from './actions';

// Envuelve todas las páginas de /admin con el menú lateral. Sin sesión de
// admin (ej. /admin/login) se muestra la página sola; el acceso real lo
// siguen protegiendo proxy.ts y la verificación de cada página.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    isAdmin = data?.role === 'admin';
  }

  if (!user || !isAdmin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <AdminSidebar email={user.email ?? ''} signOutAction={signOutAction} />
      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
