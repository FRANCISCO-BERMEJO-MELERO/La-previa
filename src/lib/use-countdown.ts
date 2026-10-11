'use client';

import { useEffect, useState } from 'react';

const TICK_MS = 250;

/** Segundos que faltan, redondeados hacia arriba y nunca negativos. */
export function secondsLeft(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

/**
 * Cuenta atrás hasta `deadline`, medida con la hora del servidor de la última foto para no
 * depender del reloj del móvil. Nula si no hay hora límite o hasta el primer tic.
 */
export function useCountdown(deadline: string | null, serverTime: string): number | null {
  // Cada cuenta va con su hora límite: al abrir otra votación, la cuenta de la anterior (que
  // acabó en 0) no vale y no debe cerrar la nueva antes del primer tic.
  const [count, setCount] = useState<{ deadline: string; left: number } | null>(null);

  useEffect(() => {
    if (deadline === null) return;
    const deadlineMs = Date.parse(deadline);
    const serverMs = Date.parse(serverTime);
    const startedAt = Date.now();
    const tick = () => {
      setCount({ deadline, left: secondsLeft(deadlineMs, serverMs + Date.now() - startedAt) });
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [deadline, serverTime]);

  return deadline !== null && count?.deadline === deadline ? count.left : null;
}
