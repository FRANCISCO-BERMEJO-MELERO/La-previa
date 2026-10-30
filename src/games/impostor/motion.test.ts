import { describe, expect, it } from 'vitest';
import { transitionOf } from '@/lib/motion';
import type { ImpostorGameState, Snapshot } from '@/lib/snapshot';
import { gameState, ids, inGame } from '@/test/fixtures';
import { impostorMotion, justVoted } from './motion';

type Participant = ImpostorGameState['participants'][number];

function voters(voted: readonly string[]): Participant[] {
  return gameState().participants.map((p) => ({ ...p, has_voted: voted.includes(p.user_id) }));
}

/** La misma foto vista por un jugador y por el impostor. */
function asRole(snapshot: Snapshot, role: 'player' | 'impostor'): Snapshot {
  const game = snapshot.game;
  if (game?.type !== 'impostor') return snapshot;
  return {
    ...snapshot,
    game: {
      ...game,
      hint: role === 'impostor' ? 'Valencia' : null,
      my: { ...game.my, role, word: role === 'impostor' ? null : 'Paella' },
    },
  };
}

function motion(previous: Snapshot, next: Snapshot) {
  return impostorMotion(transitionOf(previous, next, false));
}

describe('impostorMotion', () => {
  it('un voto nuevo cae; los que ya estaban no', () => {
    const before = inGame({ phase: 'voting', participants: voters([ids.fran]) });
    const after = inGame({ phase: 'voting', participants: voters([ids.fran, ids.alvaro]) });
    expect(justVoted(motion(before, after))).toEqual([ids.alvaro]);
  });

  it('la revelación planta el sello', () => {
    const voting = inGame({ phase: 'voting' });
    const reveal = inGame({
      phase: 'reveal',
      outcome: { type: 'eliminated', user_id: ids.lucia, name: 'Lucía', was_impostor: true },
    });
    expect(motion(voting, reveal)).toEqual([{ type: 'reveal' }]);
  });

  it('el empate cae sin sello', () => {
    const voting = inGame({ phase: 'voting' });
    const tie = inGame({ phase: 'reveal', outcome: { type: 'tie', user_ids: [] } });
    expect(motion(voting, tie)).toEqual([{ type: 'tie' }]);
  });

  it('el final da el resultado', () => {
    const reveal = inGame({ phase: 'reveal' });
    const finished = inGame({ phase: 'finished' });
    expect(motion(reveal, finished)).toEqual([{ type: 'result' }]);
  });

  it('no hay eventos en la primera foto, con movimiento reducido ni tras una foto no consecutiva', () => {
    const voting = inGame({ phase: 'voting' });
    const reveal = inGame({ phase: 'reveal', outcome: { type: 'tie', user_ids: [] } });
    expect(impostorMotion(transitionOf(null, reveal, false))).toEqual([]);
    expect(impostorMotion(transitionOf(voting, reveal, true))).toEqual([]);
    const nextRound = inGame({ phase: 'talking', round: 2 });
    expect(impostorMotion(transitionOf(voting, nextRound, false))).toEqual([]);
  });

  it('privacidad: el reparto da los mismos eventos al jugador y al impostor', () => {
    const lobby = inGame({}, { game: null });
    const talking = inGame({ phase: 'talking' });
    const reveal = inGame({ phase: 'reveal', outcome: { type: 'tie', user_ids: [] } });
    for (const [previous, next] of [
      [lobby, talking],
      [reveal, inGame({ phase: 'talking', round: 2 })],
    ] as const) {
      expect(motion(asRole(previous, 'impostor'), asRole(next, 'impostor'))).toEqual(
        motion(asRole(previous, 'player'), asRole(next, 'player')),
      );
    }
  });

  it('privacidad: votar no da eventos distintos a quien es impostor', () => {
    const before = inGame({ phase: 'voting', participants: voters([]) });
    const after = inGame({ phase: 'voting', participants: voters([ids.lucia]) });
    expect(motion(asRole(before, 'impostor'), asRole(after, 'impostor'))).toEqual(
      motion(asRole(before, 'player'), asRole(after, 'player')),
    );
  });
});
