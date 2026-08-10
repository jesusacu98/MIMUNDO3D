import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente Supabase con sesión de auth basada en cookies, para usar en
// Client Components (ej. el formulario de login en /admin/login).
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
