import { playerById, players, type Player } from '@/games/rounds/game-view';
import type { ProbableGameState, Snapshot } from '@/lib/snapshot';

/** Datos propios de ¿Quién es más probable que…?, deducidos de la foto. */

export type TallyRow = {
  player: Player;
  votes: number;
  voters: string[];
  winner: boolean;
};

/** Recuento de la revelación con nombres, de más a menos votos. */
export function tallyRows(snapshot: Snapshot, game: ProbableGameState): TallyRow[] {
  const all = players(snapshot, game);
  const winners = game.round_winner_ids ?? [];
  return (game.tally ?? []).flatMap((row) => {
    const player = playerById(all, row.user_id);
    if (!player) return [];
    return [
      {
        player,
        votes: row.votes,
        voters: row.voter_ids.map((id) => playerById(all, id)?.name ?? '').filter((name) => name),
        winner: winners.includes(row.user_id),
      },
    ];
  });
}
