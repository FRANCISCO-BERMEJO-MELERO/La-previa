import type { GameId } from './snapshot';

/** Rondas que puede elegir el anfitrión en los juegos por rondas (docs/JUEGOS.md §2). */
export const ROUND_OPTIONS = [5, 10, 15] as const;
export const DEFAULT_ROUNDS = 10;

/** El impostor no va por rondas; los demás juegos, sí. */
export function isRoundGame(game: GameId): boolean {
  return game !== 'impostor';
}
