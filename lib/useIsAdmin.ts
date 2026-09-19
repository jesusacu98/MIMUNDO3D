import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

// Sólo para Client Components de páginas públicas: consulta la sesión en el
// navegador (leer cookies en el servidor volvería dinámica la página).
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      if (!cancelled && data?.role === 'admin') setIsAdmin(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
