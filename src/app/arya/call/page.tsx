// ============================================
// MitrRAI - Arya Call Page → Coming Soon
// ============================================

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AryaCallPage() {
  const router = useRouter();

  useEffect(() => {
    // Voice call is handled inside the chat page via the phone button
    router.replace('/arya/chat');
  }, [router]);

  return null;
}
