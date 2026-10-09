import { describe, expect, it } from 'vitest';
import { ids, probableState } from '@/test/fixtures';
import type { ProbableGameState } from '@/lib/snapshot';
import { viewFor } from './view';

const me = probableState().my;

function my(overrides: Partial<ProbableGameState['my']>): ProbableGameState['my'] {
  return { ...me, ...overrides };
}

const late = my({ is_participant: false, alive: false });
const leftAndBack = my({ alive: false });

describe('viewFor de probable', () => {
  it('votando y sin haber votado: pregunta y lista para votar', () => {
    expect(viewFor(probableState())).toBe('vote');
  });

  it('votando y ya ha votado: esperando votos', () => {
    expect(viewFor(probableState({ my: my({ voted_for: ids.lucia }) }))).toBe('vote_wait');
    expect(viewFor(probableState({ my: my({ voted_for: ids.fran }) }))).toBe('vote_wait');
  });

  it('en la revelación: recuento', () => {
    expect(viewFor(probableState({ phase: 'reveal', my: my({ voted_for: ids.lucia }) }))).toBe(
      'reveal',
    );
    expect(viewFor(probableState({ phase: 'reveal' }))).toBe('reveal');
  });

  it.each(['voting', 'reveal'] as const)(
    'en %s, quien llegó tarde espera a la siguiente ronda',
    (phase) => {
      expect(viewFor(probableState({ phase, my: late }))).toBe('late');
    },
  );

  it.each(['voting', 'reveal'] as const)(
    'en %s, quien se fue y ha vuelto también espera',
    (phase) => {
      expect(viewFor(probableState({ phase, my: leftAndBack }))).toBe('late');
    },
  );

  it('al terminar todos ven el resultado, también quien llegó tarde', () => {
    expect(viewFor(probableState({ phase: 'finished' }))).toBe('result');
    expect(viewFor(probableState({ phase: 'finished', my: late }))).toBe('result');
    expect(viewFor(probableState({ phase: 'finished', my: leftAndBack }))).toBe('result');
  });
});
