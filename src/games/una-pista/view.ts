import type { UnaPistaGameState } from '@/lib/snapshot';

/** Pantallas de Una sola pista (docs/JUEGOS.md §9). */
export type UnaPistaView =
  | 'late' // entra en la siguiente ronda
  | 'guesser_wait' // al adivino le toca esperar sin mirar
  | 'clue' // palabra y campo de pista
  | 'clue_wait' // esperando pistas
  | 'review' // revisión de pistas
  | 'guess' // pistas para el adivino
  | 'guess_wait' // el adivino está pensando; el árbitro marca
  | 'reveal' // palabra, resultado y todas las pistas
  | 'result'; // marcador final del equipo

export function viewFor(game: UnaPistaGameState, myId: string): UnaPistaView {
  if (game.phase === 'finished') return 'result';
  // Quien llegó tarde o se fue y ha vuelto espera a que se abra la ronda siguiente.
  if (!game.my.is_participant || !game.my.alive) return 'late';
  const guessing = game.guesser_id === myId;
  switch (game.phase) {
    case 'writing':
      if (guessing) return 'guesser_wait';
      return game.my.clue === null ? 'clue' : 'clue_wait';
    case 'review':
      return guessing ? 'guesser_wait' : 'review';
    case 'guessing':
      return guessing ? 'guess' : 'guess_wait';
    case 'reveal':
      return 'reveal';
  }
}
