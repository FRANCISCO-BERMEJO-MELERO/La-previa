import { describe, expect, it } from 'vitest';
import { cuelaIds, cuelaState, cuelaVotingOptions } from '@/test/fixtures';
import type { CuelaGameState } from '@/lib/snapshot';
import { viewFor } from './view';

const me = cuelaState().my;

function my(overrides: Partial<CuelaGameState['my']>): CuelaGameState['my'] {
  return { ...me, ...overrides };
}

function playing(count: number): CuelaGameState['participants'] {
  return Array.from({ length: count }, (_, index) => ({
    user_id: `0a1b2c3d-1111-4aaa-8bbb-${String(index + 10).padStart(12, '0')}`,
    name: `Jugador ${String(index + 1)}`,
    alive: true,
    score: 0,
    has_responded: false,
  }));
}

const late = my({ is_participant: false, alive: false });

describe('viewFor de cuela_la_mentira', () => {
  it('escribiendo y sin mentira: pregunta y campo', () => {
    expect(viewFor(cuelaState())).toBe('write');
  });

  it('escribiendo y ya la ha colado: esperando a los demás', () => {
    expect(viewFor(cuelaState({ my: my({ answer: 'Para envolver lámparas' }) }))).toBe(
      'write_wait',
    );
  });

  it('votando, el autor de una mentira vota igual', () => {
    const voting = { phase: 'voting', options: cuelaVotingOptions } as const;
    expect(viewFor(cuelaState({ ...voting, my: my({ answer: 'Para envolver lámparas' }) }))).toBe(
      'vote',
    );
  });

  it('votando sin haber escrito nada: vota igual', () => {
    expect(viewFor(cuelaState({ phase: 'voting', options: cuelaVotingOptions }))).toBe('vote');
  });

  it('votando y ya ha votado: esperando votos', () => {
    expect(
      viewFor(
        cuelaState({
          phase: 'voting',
          options: cuelaVotingOptions,
          my: my({ voted_option_id: cuelaIds.truth }),
        }),
      ),
    ).toBe('vote_wait');
  });

  it('en la revelación, todos los que juegan la ven', () => {
    expect(viewFor(cuelaState({ phase: 'reveal' }))).toBe('reveal');
  });

  it('al terminar, la clasificación también para quien llegó tarde', () => {
    expect(viewFor(cuelaState({ phase: 'finished' }))).toBe('result');
    expect(viewFor(cuelaState({ phase: 'finished', my: late }))).toBe('result');
  });

  it('quien llega tarde, o se fue y ha vuelto, entra en la ronda siguiente', () => {
    expect(viewFor(cuelaState({ my: late }))).toBe('late');
    expect(viewFor(cuelaState({ phase: 'voting', my: my({ alive: false }) }))).toBe('late');
  });

  it('con 10 jugando, el espectador mira hasta que quede sitio', () => {
    expect(viewFor(cuelaState({ my: late, participants: playing(10) }))).toBe('late_full');
    expect(viewFor(cuelaState({ my: late, participants: playing(9) }))).toBe('late');
  });
});
