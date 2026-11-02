import type { CuelaGameState } from '@/lib/snapshot';
import { MAX_CUELA_PLAYERS } from './limits';

/** Pantallas de Cuela la mentira (docs/PLAN-9.md §7). */
export type CuelaView =
  | 'late' // entra en la siguiente ronda
  | 'late_full' // con 10 jugando, mira hasta que quede sitio
  | 'write' // pregunta y campo para la mentira
  | 'write_wait' // su mentira y esperando a los demás
  | 'vote' // opciones para votar la verdad
  | 'vote_wait' // su voto y esperando a los demás
  | 'reveal' // la verdad, las mentiras y los puntos
  | 'result'; // clasificación final

export function viewFor(game: CuelaGameState): CuelaView {
  if (game.phase === 'finished') return 'result';
  // Quien llegó tarde o se fue y ha vuelto espera a la ronda siguiente, si cabe.
  if (!game.my.is_participant || !game.my.alive) {
    const playing = game.participants.filter((player) => player.alive).length;
    return playing >= MAX_CUELA_PLAYERS ? 'late_full' : 'late';
  }
  switch (game.phase) {
    case 'writing':
      return game.my.answer === null ? 'write' : 'write_wait';
    case 'voting':
      return game.my.voted_option_id === null ? 'vote' : 'vote_wait';
    case 'reveal':
      return 'reveal';
  }
}
