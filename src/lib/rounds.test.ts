import { describe, expect, it } from 'vitest';
import { defaultRounds, isRoundGame } from './rounds';

describe('isRoundGame', () => {
  it.each([
    'probable',
    'quien_lo_dijo',
    'una_pista',
    'que_prefieres',
    'palabras_prohibidas',
    'cuela_la_mentira',
  ] as const)('%s va por rondas', (game) => {
    expect(isRoundGame(game)).toBe(true);
  });

  it.each(['impostor', 'luna_llena'] as const)('%s no va por rondas', (game) => {
    expect(isRoundGame(game)).toBe(false);
  });
});

describe('defaultRounds', () => {
  it.each([
    'probable',
    'quien_lo_dijo',
    'una_pista',
    'que_prefieres',
    'palabras_prohibidas',
  ] as const)('%s empieza con 10 rondas', (game) => {
    expect(defaultRounds(game)).toBe(10);
  });

  it('Cuela la mentira empieza con 5', () => {
    expect(defaultRounds('cuela_la_mentira')).toBe(5);
  });
});
