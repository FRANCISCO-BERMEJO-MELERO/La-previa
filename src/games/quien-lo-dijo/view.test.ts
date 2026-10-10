import { describe, expect, it } from 'vitest';
import { ids, quienState } from '@/test/fixtures';
import type { QuienLoDijoGameState } from '@/lib/snapshot';
import { viewFor } from './view';

const me = quienState().my;

function my(overrides: Partial<QuienLoDijoGameState['my']>): QuienLoDijoGameState['my'] {
  return { ...me, ...overrides };
}

const late = my({ is_participant: false, alive: false });
const leftAndBack = my({ alive: false });

describe('viewFor de quien_lo_dijo', () => {
  it('escribiendo y sin respuesta: pregunta y campo', () => {
    expect(viewFor(quienState())).toBe('write');
  });

  it('escribiendo y ya ha respondido: esperando respuestas', () => {
    expect(viewFor(quienState({ my: my({ answer: 'Volar' }) }))).toBe('write_wait');
  });

  it('votando, quien no es el autor y no ha votado: respuesta anónima y lista', () => {
    expect(viewFor(quienState({ phase: 'voting', my: my({ answer: 'Volar' }) }))).toBe('vote');
  });

  it('votando, el autor ve el aviso de que es la suya', () => {
    expect(viewFor(quienState({ phase: 'voting', my: my({ is_author: true }) }))).toBe('author');
  });

  it('votando y ya ha votado: esperando votos', () => {
    expect(viewFor(quienState({ phase: 'voting', my: my({ voted_for: ids.lucia }) }))).toBe(
      'vote_wait',
    );
  });

  it('en la revelación: autor y respuestas', () => {
    expect(viewFor(quienState({ phase: 'reveal' }))).toBe('reveal');
  });

  it.each(['writing', 'voting', 'reveal'] as const)(
    'en %s, quien llegó tarde o se fue y volvió espera a la siguiente ronda',
    (phase) => {
      expect(viewFor(quienState({ phase, my: late }))).toBe('late');
      expect(viewFor(quienState({ phase, my: leftAndBack }))).toBe('late');
    },
  );

  it('al terminar todos ven el resultado', () => {
    expect(viewFor(quienState({ phase: 'finished' }))).toBe('result');
    expect(viewFor(quienState({ phase: 'finished', my: late }))).toBe('result');
  });
});
