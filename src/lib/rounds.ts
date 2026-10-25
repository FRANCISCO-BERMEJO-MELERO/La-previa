import type { GameId } from './snapshot';

/** Rondas que puede elegir el anfitrión en los juegos por rondas (docs/JUEGOS.md §2). */
export const ROUND_OPTIONS = [5, 10, 15] as const;
export const DEFAULT_ROUNDS = 10;

/** Los juegos por rondas, uno a uno: un juego nuevo no hereda sus reglas sin decirlo. */
const roundGames: ReadonlySet<GameId> = new Set<GameId>([
  'probable',
  'quien_lo_dijo',
  'una_pista',
  'que_prefieres',
  'palabras_prohibidas',
]);

export function isRoundGame(game: GameId): boolean {
  return roundGames.has(game);
}
