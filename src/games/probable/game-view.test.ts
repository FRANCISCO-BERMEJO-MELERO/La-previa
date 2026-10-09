import { describe, expect, it } from 'vitest';
import { ids, inProbable, probableState } from '@/test/fixtures';
import {
  activePlayers,
  isLastRound,
  leaders,
  playerName,
  players,
  rankingRows,
  tallyRows,
} from './game-view';

const gone = '0a1b2c3d-1111-4aaa-8bbb-000000000009';

describe('datos de probable', () => {
  it('cada participante con su color de la sala, sus puntos y si ha votado', () => {
    const snapshot = inProbable();
    const game = probableState();
    expect(
      players(snapshot, game).map((p) => [p.name, p.joinIndex, p.score, p.hasResponded]),
    ).toEqual([
      ['Fran', 0, 2, false],
      ['Lucía', 1, 1, true],
      ['Álvaro', 2, 0, false],
    ]);
    expect(players(snapshot, game).map((p) => p.connected)).toEqual([true, true, false]);
  });

  it('solo los activos votan y se pueden votar', () => {
    const game = probableState({
      participants: [
        ...probableState().participants,
        { user_id: gone, name: 'Dani', alive: false, score: 3, has_responded: false },
      ],
    });
    expect(activePlayers(inProbable(), game).map((p) => p.name)).toEqual([
      'Fran',
      'Lucía',
      'Álvaro',
    ]);
    expect(playerName(inProbable(), game, gone)).toBe('Dani');
  });

  it('el recuento lleva nombres de quienes votaron y marca a los ganadores', () => {
    const game = probableState({
      phase: 'reveal',
      tally: [
        { user_id: ids.lucia, votes: 2, voter_ids: [ids.fran, ids.lucia] },
        { user_id: ids.alvaro, votes: 1, voter_ids: [ids.alvaro] },
      ],
      round_winner_ids: [ids.lucia],
    });
    expect(
      tallyRows(inProbable(), game).map((row) => [
        row.player.name,
        row.votes,
        row.voters,
        row.winner,
      ]),
    ).toEqual([
      ['Lucía', 2, ['Fran', 'Lucía'], true],
      ['Álvaro', 1, ['Álvaro'], false],
    ]);
  });

  it('sin recuento no hay filas', () => {
    expect(tallyRows(inProbable(), probableState())).toEqual([]);
  });

  it('la clasificación comparte puesto en los empates y nombra a los primeros', () => {
    const game = probableState({
      phase: 'finished',
      ranking: [
        { user_id: ids.fran, name: 'Fran', score: 3 },
        { user_id: ids.lucia, name: 'Lucía', score: 3 },
        { user_id: ids.alvaro, name: 'Álvaro', score: 1 },
      ],
    });
    const rows = rankingRows(inProbable(), game);
    expect(rows.map((row) => [row.player.name, row.position, row.score])).toEqual([
      ['Fran', 1, 3],
      ['Lucía', 1, 3],
      ['Álvaro', 3, 1],
    ]);
    expect(leaders(rows).map((p) => p.name)).toEqual(['Fran', 'Lucía']);
  });

  it('si nadie ha puntuado no hay más probable de la noche', () => {
    const game = probableState({
      phase: 'finished',
      ranking: [
        { user_id: ids.fran, name: 'Fran', score: 0 },
        { user_id: ids.lucia, name: 'Lucía', score: 0 },
      ],
    });
    expect(leaders(rankingRows(inProbable(), game))).toEqual([]);
  });

  it('sabe si es la última ronda', () => {
    expect(isLastRound(probableState({ round: 9, total_rounds: 10 }))).toBe(false);
    expect(isLastRound(probableState({ round: 10, total_rounds: 10 }))).toBe(true);
  });
});
