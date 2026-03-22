'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AryaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AryaError]', error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <p className="text-5xl mb-4">🤖</p>
      <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">Arya had a hiccup</h2>
      <p className="text-sm text-[var(--muted-strong)] mb-6 max-w-sm">
        The AI session crashed unexpectedly. Your previous conversations are safe.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          Try again
        </button>
        <button
          onClick={() => router.push('/home')}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[var(--foreground)] bg-[var(--surface)] border border-[var(--border)]"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
