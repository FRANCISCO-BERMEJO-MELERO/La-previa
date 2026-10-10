import { describe, expect, it } from 'vitest';
import { gameState, ids, inGame, lobbySnapshot } from '@/test/fixtures';
import type { ImpostorGameState } from '@/lib/snapshot';
import { viewFor } from './view';

const me = gameState().my;

function my(overrides: Partial<ImpostorGameState['my']>): ImpostorGameState['my'] {
  return { ...me, ...overrides };
}

const spectator = my({ is_participant: false, alive: false, role: null, word: null });
const impostor = my({ role: 'impostor', word: null });
const eliminated = my({ alive: false });

// Una fila por cada caso de la tabla de docs/CONTEXTO.md §6.
describe('viewFor', () => {
  it('04 · sin partida: sala de espera', () => {
    expect(viewFor(lobbySnapshot())).toBe('lobby');
  });

  it.each(['talking', 'voting', 'reveal'] as const)(
    '05 · partida en %s sin participar: entrar tarde',
    (phase) => {
      expect(viewFor(inGame({ phase, my: spectator }))).toBe('late');
    },
  );

  it('06 · hablando, vivo y jugador normal: reparto de jugador', () => {
    expect(viewFor(inGame({ phase: 'talking' }))).toBe('deal_player');
  });

  it('07 · hablando, vivo e impostor: reparto de impostor', () => {
    expect(viewFor(inGame({ phase: 'talking', my: impostor }))).toBe('deal_impostor');
  });

  it('08 · votando, vivo y sin votar: votación', () => {
    expect(viewFor(inGame({ phase: 'voting' }))).toBe('vote');
    expect(viewFor(inGame({ phase: 'voting', my: impostor }))).toBe('vote');
  });

  it('09 · votando, vivo y ya ha votado: esperando votos', () => {
    expect(viewFor(inGame({ phase: 'voting', my: my({ voted_for: ids.lucia }) }))).toBe(
      'vote_wait',
    );
  });

  it('10 · revelación de una expulsión o de un abandono', () => {
    const eliminatedOutcome = {
      type: 'eliminated' as const,
      user_id: ids.alvaro,
      name: 'Álvaro',
      was_impostor: false,
    };
    expect(viewFor(inGame({ phase: 'reveal', outcome: eliminatedOutcome }))).toBe('reveal');
    expect(
      viewFor(inGame({ phase: 'reveal', outcome: { ...eliminatedOutcome, type: 'left' } })),
    ).toBe('reveal');
  });

  it('11 · revelación de un empate, también sin votos', () => {
    expect(
      viewFor(
        inGame({ phase: 'reveal', outcome: { type: 'tie', user_ids: [ids.alvaro, ids.marta] } }),
      ),
    ).toBe('tie');
    expect(viewFor(inGame({ phase: 'reveal', outcome: { type: 'tie', user_ids: [] } }))).toBe(
      'tie',
    );
  });

  it('11 · un eliminado también ve la revelación', () => {
    expect(
      viewFor(inGame({ phase: 'reveal', my: eliminated, outcome: { type: 'tie', user_ids: [] } })),
    ).toBe('tie');
  });

  it.each(['talking', 'voting'] as const)('12 · %s y eliminado: estás fuera', (phase) => {
    expect(viewFor(inGame({ phase, my: eliminated }))).toBe('out');
  });

  it('13 · terminada y gana mi bando: has ganado', () => {
    const groupWins = { winner: 'group' as const, word: 'Paella', impostor_ids: [ids.marta] };
    const impostorsWin = { ...groupWins, winner: 'impostors' as const };
    expect(viewFor(inGame({ phase: 'finished', result: groupWins }))).toBe('won');
    expect(viewFor(inGame({ phase: 'finished', result: impostorsWin, my: impostor }))).toBe('won');
  });

  it('13 · un eliminado del bando ganador también gana', () => {
    const groupWins = { winner: 'group' as const, word: 'Paella', impostor_ids: [ids.marta] };
    expect(viewFor(inGame({ phase: 'finished', result: groupWins, my: eliminated }))).toBe('won');
  });

  it('14 · terminada y gana el otro bando: has perdido', () => {
    const groupWins = { winner: 'group' as const, word: 'Paella', impostor_ids: [ids.fran] };
    const impostorsWin = { ...groupWins, winner: 'impostors' as const };
    expect(viewFor(inGame({ phase: 'finished', result: impostorsWin }))).toBe('lost');
    expect(viewFor(inGame({ phase: 'finished', result: groupWins, my: impostor }))).toBe('lost');
  });

  it('resultado neutro para quien llegó tarde', () => {
    const groupWins = { winner: 'group' as const, word: 'Paella', impostor_ids: [ids.marta] };
    expect(viewFor(inGame({ phase: 'finished', result: groupWins, my: spectator }))).toBe(
      'result_spectator',
    );
  });
});
