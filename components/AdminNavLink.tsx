'use client';

import Link from 'next/link';
import { useIsAdmin } from '@/lib/useIsAdmin';

interface AdminNavLinkProps {
  className?: string;
}

export default function AdminNavLink({ className }: AdminNavLinkProps) {
  const isAdmin = useIsAdmin();

  if (!isAdmin) return null;

  return (
    <Link href="/admin" className={className}>
      Admin
    </Link>
  );
}
