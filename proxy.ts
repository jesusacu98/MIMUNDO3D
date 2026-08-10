import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { supabase, supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === '/admin/login';

  let isAdmin = false;
  if (user) {
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    isAdmin = data?.role === 'admin';
  }

  if (!isLoginPage && !isAdmin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage && isAdmin) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = '/admin';
    return NextResponse.redirect(adminUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*'],
};
