import { activePlayers, playerById, players, type Player } from '@/games/rounds/game-view';
import type { PalabrasProhibidasGameState, Snapshot } from '@/lib/snapshot';

/** Datos propios de Palabras prohibidas, deducidos de la foto. */

/** Quienes pueden haber acertado: los activos que ni describen ni vigilan. */
export function guessers(snapshot: Snapshot, game: PalabrasProhibidasGameState): Player[] {
  return activePlayers(snapshot, game).filter(
    (player) => player.userId !== game.describer_id && player.userId !== game.watcher_id,
  );
}

/** Nombre de un participante de la partida, o vacío si no se sabe. */
export function nameOf(
  snapshot: Snapshot,
  game: PalabrasProhibidasGameState,
  userId: string | null,
): string {
  if (!userId) return '';
  return playerById(players(snapshot, game), userId)?.name ?? '';
}
