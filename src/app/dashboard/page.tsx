// ============================================
// MitrAI - Dashboard Redirect (-> /home)
// Dashboard was removed; all traffic redirects to /home.
// ============================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/home'); }, [router]);
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <p className="text-sm text-[var(--muted)] animate-pulse">Redirecting...</p>
    </div>
  );
}
