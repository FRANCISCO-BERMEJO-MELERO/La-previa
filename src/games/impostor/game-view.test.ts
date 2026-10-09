import { describe, expect, it } from 'vitest';
import { gameState, ids, inGame, lobbySnapshot } from '@/test/fixtures';
import {
  aliveCount,
  connectedCount,
  hostName,
  namesOf,
  participant,
  participants,
  voteCandidates,
  voteProgress,
} from './game-view';

const leftId = '0a1b2c3d-1111-4aaa-8bbb-000000000009';

function withLeaver() {
  const game = gameState({
    participants: [
      { user_id: ids.fran, name: 'Fran', alive: true, has_voted: true },
      { user_id: ids.lucia, name: 'Lucía', alive: true, has_voted: false },
      { user_id: ids.alvaro, name: 'Álvaro', alive: false, has_voted: false },
      { user_id: leftId, name: 'Dani', alive: false, has_voted: false },
    ],
  });
  return { snapshot: inGame(game), game };
}

describe('game-view', () => {
  it('hostName da el nombre del anfitrión', () => {
    expect(hostName(lobbySnapshot())).toBe('Fran');
  });

  it('participants usa el orden de entrada a la sala para el color y la conexión de la sala', () => {
    const { snapshot, game } = withLeaver();
    expect(participants(snapshot, game)).toEqual([
      {
        userId: ids.fran,
        name: 'Fran',
        joinIndex: 0,
        alive: true,
        hasVoted: true,
        connected: true,
      },
      {
        userId: ids.lucia,
        name: 'Lucía',
        joinIndex: 1,
        alive: true,
        hasVoted: false,
        connected: true,
      },
      {
        userId: ids.alvaro,
        name: 'Álvaro',
        joinIndex: 2,
        alive: false,
        hasVoted: false,
        connected: false,
      },
      {
        userId: leftId,
        name: 'Dani',
        joinIndex: 3,
        alive: false,
        hasVoted: false,
        connected: false,
      },
    ]);
  });

  it('participant busca a uno', () => {
    const { snapshot, game } = withLeaver();
    expect(participant(snapshot, game, ids.lucia)?.name).toBe('Lucía');
    expect(participant(snapshot, game, 'nadie')).toBeUndefined();
  });

  it('se puede votar a los vivos menos a uno mismo', () => {
    const { snapshot, game } = withLeaver();
    expect(voteCandidates(snapshot, game).map((p) => p.name)).toEqual(['Lucía']);
  });

  it('voteProgress cuenta solo a los vivos', () => {
    expect(voteProgress(withLeaver().game)).toEqual({ voted: 1, total: 2 });
  });

  it('aliveCount cuenta a los que siguen', () => {
    expect(aliveCount(withLeaver().game)).toBe(2);
  });

  it('namesOf traduce ids a nombres, también de quien se fue', () => {
    const { snapshot, game } = withLeaver();
    expect(namesOf(snapshot, game, [ids.lucia, leftId])).toEqual(['Lucía', 'Dani']);
  });

  it('connectedCount cuenta a los conectados de la sala', () => {
    expect(connectedCount(lobbySnapshot())).toBe(2);
  });
});
