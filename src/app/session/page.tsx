'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SessionPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/doubts'); }, [router]);
  return null;
}
