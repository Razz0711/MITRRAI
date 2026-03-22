'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <p className="text-5xl mb-4">⚠️</p>
      <h2 className="text-lg font-bold text-[var(--foreground)] mb-2">Something went wrong</h2>
      <p className="text-sm text-[var(--muted-strong)] mb-6 max-w-sm">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'var(--primary)' }}
      >
        Try again
      </button>
    </div>
  );
}
