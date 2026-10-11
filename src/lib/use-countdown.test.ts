import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { secondsLeft, useCountdown } from './use-countdown';

describe('secondsLeft', () => {
  it('redondea hacia arriba y no baja de cero', () => {
    expect(secondsLeft(30_000, 0)).toBe(30);
    expect(secondsLeft(30_000, 29_001)).toBe(1);
    expect(secondsLeft(30_000, 30_000)).toBe(0);
    expect(secondsLeft(30_000, 45_000)).toBe(0);
  });
});

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // El reloj del móvil va 5 minutos adelantado: no debe notarse.
    vi.setSystemTime(new Date('2026-10-11T12:05:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cuenta con la hora del servidor, no con la del móvil', () => {
    const { result } = renderHook(() =>
      useCountdown('2026-10-11T12:00:30Z', '2026-10-11T12:00:00Z'),
    );
    expect(result.current).toBe(30);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current).toBe(20);
    act(() => {
      vi.advanceTimersByTime(25_000);
    });
    expect(result.current).toBe(0);
  });

  it('sin hora límite no hay cuenta atrás', () => {
    const { result } = renderHook(() => useCountdown(null, '2026-10-11T12:00:00Z'));
    expect(result.current).toBeNull();
  });
});
