import { useEffect, useRef } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  released: boolean;
}

// Keep the screen awake while `active` is true. Feature-detected and silent on
// unsupported browsers (iOS needs 16.4+, and an installed PWA needs 18.4+).
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) return;

    let cancelled = false;

    const request = async () => {
      try {
        const sentinel = await nav.wakeLock!.request('screen');
        if (cancelled) {
          void sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
      } catch {
        // user gesture missing or not permitted — ignore
      }
    };

    const release = () => {
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s && !s.released) void s.release();
    };

    // Re-acquire when the tab becomes visible again (iOS drops the lock).
    const onVisible = () => {
      if (active && document.visibilityState === 'visible') void request();
    };

    if (active) {
      void request();
      document.addEventListener('visibilitychange', onVisible);
    } else {
      release();
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      release();
    };
  }, [active]);
}
