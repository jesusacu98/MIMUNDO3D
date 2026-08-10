'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

interface AdminNavLinkProps {
  className?: string;
}

export default function AdminNavLink({ className }: AdminNavLinkProps) {
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

  if (!isAdmin) return null;

  return (
    <Link href="/admin" className={className}>
      Admin
    </Link>
  );
}
