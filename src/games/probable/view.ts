import type { ProbableGameState } from '@/lib/snapshot';

/** Pantallas de ¿Quién es más probable que…? (docs/JUEGOS.md §9). */
export type ProbableView =
  | 'late' // entra en la siguiente ronda
  | 'vote' // pregunta y lista para votar
  | 'vote_wait' // esperando votos
  | 'reveal' // recuento
  | 'result'; // clasificación final

export function viewFor(game: ProbableGameState): ProbableView {
  if (game.phase === 'finished') return 'result';
  // Quien llegó tarde o se fue y ha vuelto espera a que se abra la ronda siguiente.
  if (!game.my.is_participant || !game.my.alive) return 'late';
  if (game.phase === 'reveal') return 'reveal';
  return game.my.voted_for === null ? 'vote' : 'vote_wait';
}
