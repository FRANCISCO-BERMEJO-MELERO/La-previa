import { useEffect, useState } from 'react';
import { countDuration, easeOutCubic } from './motion';

/**
 * «Contar» (docs/PLAN-8.md §2): el número va de `from` a `to` tras `delay` ms. Sin `from`, o si no
 * cambia, es `to` desde el principio.
 */
export function useCountUp(from: number | null, to: number, delay = 0): number {
  const key = from === null || from === to ? null : `${String(from)}:${String(to)}`;
  const [frame, setFrame] = useState<{ key: string; value: number } | null>(null);

  useEffect(() => {
    if (key === null || from === null) return;
    const duration = countDuration(from, to);
    let start: number | null = null;
    let request = 0;
    const tick = (now: number) => {
      start ??= now + delay;
      const progress = (now - start) / duration;
      const value = progress >= 1 ? to : Math.round(from + (to - from) * easeOutCubic(progress));
      setFrame({ key, value });
      if (progress < 1) request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(request);
    };
  }, [key, from, to, delay]);

  if (key === null || from === null) return to;
  return frame?.key === key ? frame.value : from;
}
