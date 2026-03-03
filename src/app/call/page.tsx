// Calls feature removed - redirect to home
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function CallPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/home'); }, [router]);
  return null;
}
