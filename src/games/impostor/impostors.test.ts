import { describe, expect, it } from 'vitest';
import { clampImpostors, impostorLimits } from './impostors';

describe('impostorLimits', () => {
  it.each([
    [1, 1],
    [3, 1],
    [4, 1],
    [5, 2],
    [6, 2],
    [7, 3],
    [16, 7],
  ])('con %i jugadores admite hasta %i impostores', (players, max) => {
    expect(impostorLimits(players)).toEqual({ min: 1, max });
  });

  it('el máximo siempre cumple 2 × impostores < jugadores', () => {
    for (let players = 3; players <= 16; players++) {
      expect(2 * impostorLimits(players).max).toBeLessThan(players);
    }
  });
});

describe('clampImpostors', () => {
  it('baja la elección si se va gente', () => {
    expect(clampImpostors(3, 5)).toBe(2);
  });

  it('nunca baja de uno', () => {
    expect(clampImpostors(0, 8)).toBe(1);
  });

  it('respeta una elección válida', () => {
    expect(clampImpostors(2, 8)).toBe(2);
  });
});
