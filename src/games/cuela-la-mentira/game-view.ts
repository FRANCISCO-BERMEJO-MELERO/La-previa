import { playerById, players, type Player } from '@/games/rounds/game-view';
import type { CuelaGameState, Snapshot } from '@/lib/snapshot';

/** Datos propios de Cuela la mentira, deducidos de la foto. */

export type RevealLie = {
  id: string;
  text: string;
  /** Sin autores es de la casa. */
  authors: Player[];
  /** Autores que se fueron antes de puntuar: no cobran. */
  leftIds: string[];
  voters: Player[];
};

export type RevealData = {
  truth: { text: string; voters: Player[] } | null;
  /** Las votadas primero; las que no votó nadie, al final. Cada grupo, en el orden de la votación. */
  lies: RevealLie[];
  points: { player: Player; points: number }[];
};

function pick(all: Player[], userIds: readonly string[] = []): Player[] {
  return userIds.flatMap((userId) => {
    const player = playerById(all, userId);
    return player ? [player] : [];
  });
}

export function revealData(snapshot: Snapshot, game: CuelaGameState): RevealData {
  const all = players(snapshot, game);
  const options = game.options ?? [];
  const truth = options.find((option) => option.kind === 'truth');
  const lies = options
    .filter((option) => option.kind !== 'truth')
    .map((option) => ({
      id: option.id,
      text: option.text,
      authors: pick(all, option.author_ids),
      leftIds: [...(option.left_author_ids ?? [])],
      voters: pick(all, option.voter_ids),
    }));
  return {
    truth: truth ? { text: truth.text, voters: pick(all, truth.voter_ids) } : null,
    lies: [
      ...lies.filter((lie) => lie.voters.length > 0),
      ...lies.filter((lie) => lie.voters.length === 0),
    ],
    points: (game.round_points ?? []).flatMap((row) => {
      const player = playerById(all, row.user_id);
      return player ? [{ player, points: row.points }] : [];
    }),
  };
}
