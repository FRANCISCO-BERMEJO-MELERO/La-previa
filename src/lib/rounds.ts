import type { GameId } from './snapshot';

/** Rondas que puede elegir el anfitrión en los juegos por rondas (docs/JUEGOS.md §2). */
export const ROUND_OPTIONS = [5, 10, 15] as const;

/** Los juegos por rondas, uno a uno: un juego nuevo no hereda sus reglas sin decirlo. */
const roundGames: ReadonlySet<GameId> = new Set<GameId>([
  'probable',
  'quien_lo_dijo',
  'una_pista',
  'que_prefieres',
  'palabras_prohibidas',
  'cuela_la_mentira',
]);

export function isRoundGame(game: GameId): boolean {
  return roundGames.has(game);
}

/** Rondas con las que empieza el selector: 10, salvo Cuela la mentira, que va con 5 (docs/PLAN-9.md §1). */
export function defaultRounds(game: GameId): number {
  return game === 'cuela_la_mentira' ? 5 : 10;
}
