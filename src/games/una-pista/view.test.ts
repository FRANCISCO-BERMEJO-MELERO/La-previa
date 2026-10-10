import { describe, expect, it } from 'vitest';
import { ids, pistaState } from '@/test/fixtures';
import type { UnaPistaGameState } from '@/lib/snapshot';
import { viewFor } from './view';

const me = pistaState().my;

function my(overrides: Partial<UnaPistaGameState['my']>): UnaPistaGameState['my'] {
  return { ...me, ...overrides };
}

// En los fixtures adivina Lucía; Fran da pista.
describe('viewFor de una_pista', () => {
  it('escribiendo, quien da pista y aún no la ha dado: palabra y campo', () => {
    expect(viewFor(pistaState(), ids.fran)).toBe('clue');
  });

  it('escribiendo y ya la ha dado: esperando pistas', () => {
    expect(viewFor(pistaState({ my: my({ clue: 'frío' }) }), ids.fran)).toBe('clue_wait');
  });

  it.each(['writing', 'review'] as const)('en %s, el adivino espera sin mirar', (phase) => {
    expect(viewFor(pistaState({ phase, word: null, category: null }), ids.lucia)).toBe(
      'guesser_wait',
    );
  });

  it('revisando, quien da pista ve la revisión', () => {
    expect(viewFor(pistaState({ phase: 'review' }), ids.fran)).toBe('review');
  });

  it('adivinando, el adivino ve sus pistas y los demás esperan', () => {
    expect(viewFor(pistaState({ phase: 'guessing' }), ids.lucia)).toBe('guess');
    expect(viewFor(pistaState({ phase: 'guessing' }), ids.fran)).toBe('guess_wait');
  });

  it('en la revelación todos ven lo mismo', () => {
    expect(viewFor(pistaState({ phase: 'reveal' }), ids.lucia)).toBe('reveal');
    expect(viewFor(pistaState({ phase: 'reveal' }), ids.fran)).toBe('reveal');
  });

  it.each(['writing', 'review', 'guessing', 'reveal'] as const)(
    'en %s, quien llegó tarde o se fue y volvió espera a la siguiente ronda',
    (phase) => {
      expect(
        viewFor(pistaState({ phase, my: my({ is_participant: false, alive: false }) }), ids.marta),
      ).toBe('late');
      expect(viewFor(pistaState({ phase, my: my({ alive: false }) }), ids.fran)).toBe('late');
    },
  );

  it('al terminar todos ven el marcador', () => {
    expect(viewFor(pistaState({ phase: 'finished' }), ids.fran)).toBe('result');
    expect(
      viewFor(
        pistaState({ phase: 'finished', my: my({ is_participant: false, alive: false }) }),
        ids.marta,
      ),
    ).toBe('result');
  });
});
