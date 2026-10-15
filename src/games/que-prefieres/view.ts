import type { QuePrefieresGameState } from '@/lib/snapshot';

/** Pantallas de ¿Qué prefieres? (docs/JUEGOS-2.md §7). */
export type QuePrefieresView =
  | 'late' // entra en la siguiente ronda
  | 'choose' // dilema con las dos opciones
  | 'choose_wait' // esperando elecciones
  | 'reveal' // reparto
  | 'result'; // clasificación final

export function viewFor(game: QuePrefieresGameState): QuePrefieresView {
  if (game.phase === 'finished') return 'result';
  // Quien llegó tarde o se fue y ha vuelto espera a que se abra la ronda siguiente.
  if (!game.my.is_participant || !game.my.alive) return 'late';
  if (game.phase === 'reveal') return 'reveal';
  return game.my.choice === null ? 'choose' : 'choose_wait';
}
