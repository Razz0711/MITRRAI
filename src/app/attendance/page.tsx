'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AttendancePage() {
  const router = useRouter();
  useEffect(() => { router.replace('/me'); }, [router]);
  return null;
}
