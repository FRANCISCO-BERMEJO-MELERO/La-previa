import { describe, expect, it } from 'vitest';
import { prefieresState } from '@/test/fixtures';
import type { QuePrefieresGameState } from '@/lib/snapshot';
import { viewFor } from './view';

const me = prefieresState().my;

function my(overrides: Partial<QuePrefieresGameState['my']>): QuePrefieresGameState['my'] {
  return { ...me, ...overrides };
}

const late = my({ is_participant: false, alive: false });
const leftAndBack = my({ alive: false });

describe('viewFor de que_prefieres', () => {
  it('eligiendo y sin haber elegido: el dilema', () => {
    expect(viewFor(prefieresState())).toBe('choose');
  });

  it.each(['a', 'b'] as const)(
    'eligiendo y ya ha elegido la %s: esperando elecciones',
    (choice) => {
      expect(viewFor(prefieresState({ my: my({ choice }) }))).toBe('choose_wait');
    },
  );

  it('en la revelación: reparto, haya elegido o no', () => {
    expect(viewFor(prefieresState({ phase: 'reveal', my: my({ choice: 'a' }) }))).toBe('reveal');
    expect(viewFor(prefieresState({ phase: 'reveal' }))).toBe('reveal');
  });

  it.each(['voting', 'reveal'] as const)(
    'en %s, quien llegó tarde espera a la siguiente ronda',
    (phase) => {
      expect(viewFor(prefieresState({ phase, my: late }))).toBe('late');
    },
  );

  it.each(['voting', 'reveal'] as const)(
    'en %s, quien se fue y ha vuelto también espera',
    (phase) => {
      expect(viewFor(prefieresState({ phase, my: leftAndBack }))).toBe('late');
    },
  );

  it('al terminar todos ven el resultado, también quien llegó tarde', () => {
    expect(viewFor(prefieresState({ phase: 'finished' }))).toBe('result');
    expect(viewFor(prefieresState({ phase: 'finished', my: late }))).toBe('result');
    expect(viewFor(prefieresState({ phase: 'finished', my: leftAndBack }))).toBe('result');
  });
});
