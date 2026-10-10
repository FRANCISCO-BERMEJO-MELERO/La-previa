import type { QuienLoDijoGameState } from '@/lib/snapshot';

/** Pantallas de ¿Quién lo dijo? (docs/JUEGOS.md §9). */
export type QuienLoDijoView =
  | 'late' // entra en la siguiente ronda
  | 'write' // pregunta y campo de respuesta
  | 'write_wait' // esperando respuestas
  | 'vote' // respuesta anónima y lista para votar
  | 'author' // aviso de que la respuesta elegida es la suya
  | 'vote_wait' // esperando votos
  | 'reveal' // autor y resto de respuestas
  | 'result'; // clasificación final

export function viewFor(game: QuienLoDijoGameState): QuienLoDijoView {
  if (game.phase === 'finished') return 'result';
  // Quien llegó tarde o se fue y ha vuelto espera a que se abra la ronda siguiente.
  if (!game.my.is_participant || !game.my.alive) return 'late';
  switch (game.phase) {
    case 'writing':
      return game.my.answer === null ? 'write' : 'write_wait';
    case 'voting':
      if (game.my.is_author) return 'author';
      return game.my.voted_for === null ? 'vote' : 'vote_wait';
    case 'reveal':
      return 'reveal';
  }
}
