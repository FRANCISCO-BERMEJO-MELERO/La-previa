import { playerById, players, type Player } from '@/games/rounds/game-view';
import type { Snapshot, UnaPistaGameState } from '@/lib/snapshot';

/** Datos propios de Una sola pista, deducidos de la foto. */

export type ClueRow = {
  /** Sin autor cuando la foto no lo da (el adivino nunca lo recibe). */
  author: Player | null;
  text: string;
  cancelled: boolean;
};

export function clueRows(snapshot: Snapshot, game: UnaPistaGameState): ClueRow[] {
  const all = players(snapshot, game);
  return (game.clues ?? []).map((clue) => ({
    author: clue.user_id ? (playerById(all, clue.user_id) ?? null) : null,
    text: clue.text,
    cancelled: clue.cancelled ?? false,
  }));
}

/** Nombre de un participante de la partida, o vacío si no se sabe. */
export function nameOf(snapshot: Snapshot, game: UnaPistaGameState, userId: string | null): string {
  if (!userId) return '';
  return playerById(players(snapshot, game), userId)?.name ?? '';
}
