'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const SYNC_INTERVAL_MS = 60000; // Sync every 60 seconds

type FeatureCategory = 'arya' | 'anon' | 'feed' | 'community' | 'general';

export function useTimeTracker() {
  const { user } = useAuth();
  const pathname = usePathname();
  
  // Accumulators (in seconds)
  const accumulators = useRef<Record<FeatureCategory, number>>({
    arya: 0,
    anon: 0,
    feed: 0,
    community: 0,
    general: 0
  });

  // Track the timestamp when the current "session segment" started
  const lastActiveRef = useRef<number>(Date.now());
  
  // Track continuous intervals
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getCategoryFromPath = (path: string): FeatureCategory => {
    if (path.startsWith('/arya')) return 'arya';
    if (path.startsWith('/anon')) return 'anon';
    if (path.startsWith('/feed')) return 'feed';
    if (path.startsWith('/community')) return 'community';
    return 'general';
  };

  const syncToServer = () => {
    const currentAccumulators = { ...accumulators.current };
    const totalToSync = Object.values(currentAccumulators).reduce((a, b) => a + b, 0);

    // Only hit the server if we have data to send
    if (totalToSync > 0) {
      // Reset accumulators immediately
      accumulators.current = {
        arya: 0,
        anon: 0,
        feed: 0,
        community: 0,
        general: 0
      };

      // Best effort background request (keepalive for page unload)
      try {
        fetch('/api/analytics/time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deltas: currentAccumulators }),
          keepalive: true, 
        }).catch(() => {
          // Silent catch to prevent console noise (fire and forget)
        });
      } catch {
        // Ignored
      }
    }
  };

  const recordElapsed = () => {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastActiveRef.current) / 1000);
    
    if (elapsedSeconds > 0) {
      const category = getCategoryFromPath(pathname || '');
      accumulators.current[category] += elapsedSeconds;
    }
    
    // Reset our start time for the next slice
    lastActiveRef.current = now;
  };

  // Main lifecycle
  useEffect(() => {
    // We only track securely logged-in users
    if (!user) return;

    // Start a fresh segment whenever path changes or user is established
    lastActiveRef.current = Date.now();

    // Setup rhythmic syncing to server
    intervalRef.current = setInterval(() => {
      recordElapsed(); // capture any lingering seconds
      syncToServer();  // flush to DB
    }, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      // On unmount (e.g. route change), record elapsed but don't force a sync unless necessary
      // It's covered by the interval/unload. We just attribute the last seconds to the old route.
      recordElapsed(); 
    };
  }, [user, pathname]);

  // Window hide/unload handlers
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // User tabbed away or minimized phone
        recordElapsed();
        syncToServer();
      } else {
        // User came back
        lastActiveRef.current = Date.now();
      }
    };

    const handleBeforeUnload = () => {
      // User is closing the tab/browser
      recordElapsed();
      syncToServer();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, pathname]);

}
