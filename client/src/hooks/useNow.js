import { useEffect, useState } from 'react';

/**
 * Reactive “now” clock for live countdowns.
 * @param {number} intervalMs refresh rate (default 1s)
 * @param {boolean} enabled pause when not needed
 */
export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return undefined;

    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), Math.max(250, intervalMs));
    return () => window.clearInterval(id);
  }, [intervalMs, enabled]);

  return now;
}
