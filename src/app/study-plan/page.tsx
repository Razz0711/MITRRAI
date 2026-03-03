'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudyPlanPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/home'); }, [router]);
  return null;
}
