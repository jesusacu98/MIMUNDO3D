import { createServerSupabaseClient } from '@/lib/supabase/server';

// Para usar en Server Components públicos (ej. mostrar el botón "Admin"
// sólo si la sesión activa tiene rol 'admin').
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
  return data?.role === 'admin';
}
