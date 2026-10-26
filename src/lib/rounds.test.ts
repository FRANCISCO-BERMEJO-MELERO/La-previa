import { describe, expect, it } from 'vitest';
import { isRoundGame } from './rounds';

describe('isRoundGame', () => {
  it.each([
    'probable',
    'quien_lo_dijo',
    'una_pista',
    'que_prefieres',
    'palabras_prohibidas',
  ] as const)('%s va por rondas', (game) => {
    expect(isRoundGame(game)).toBe(true);
  });

  it.each(['impostor', 'luna_llena'] as const)('%s no va por rondas', (game) => {
    expect(isRoundGame(game)).toBe(false);
  });
});
