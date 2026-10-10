import { playerById, players, type Player } from '@/games/rounds/game-view';
import type { QuienLoDijoGameState, Snapshot } from '@/lib/snapshot';

/** Datos propios de ¿Quién lo dijo?, deducidos de la foto. */

export type RevealData = {
  /** Nulo si la ronda se anuló porque se fue el autor. */
  author: Player | null;
  correct: string[];
  wrong: string[];
  /** Todas las respuestas de la ronda menos la elegida, con su autor. */
  others: { player: Player; text: string }[];
};

function names(all: Player[], ids: readonly string[] | null): string[] {
  return (ids ?? []).map((id) => playerById(all, id)?.name ?? '').filter((name) => name);
}

export function revealData(snapshot: Snapshot, game: QuienLoDijoGameState): RevealData {
  const all = players(snapshot, game);
  const author = game.author_id ? (playerById(all, game.author_id) ?? null) : null;
  return {
    author,
    correct: names(all, game.correct_ids),
    wrong: names(all, game.wrong_ids),
    others: (game.answers ?? [])
      .filter((answer) => answer.user_id !== game.author_id)
      .flatMap((answer) => {
        const player = playerById(all, answer.user_id);
        return player ? [{ player, text: answer.text }] : [];
      }),
  };
}
