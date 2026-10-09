import { describe, expect, it } from 'vitest';
import { ids, inProbable, probableState } from '@/test/fixtures';
import { tallyRows } from './game-view';

describe('datos de probable', () => {
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
});
