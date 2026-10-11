import type { PalabrasProhibidasGameState } from '@/lib/snapshot';

/** Pantallas de Palabras prohibidas (docs/JUEGOS-2.md §7). */
export type PalabrasProhibidasView =
  | 'late' // entra en la siguiente ronda
  | 'describe' // tarjeta, quién ha acertado y pasar
  | 'watch' // tarjeta y "¡Prohibida!"
  | 'guess' // adivinar en voz alta
  | 'reveal' // la tarjeta y cómo ha acabado
  | 'result'; // clasificación final

export function viewFor(game: PalabrasProhibidasGameState, myId: string): PalabrasProhibidasView {
  if (game.phase === 'finished') return 'result';
  // Quien llegó tarde o se fue y ha vuelto espera a que se abra la ronda siguiente.
  if (!game.my.is_participant || !game.my.alive) return 'late';
  if (game.phase === 'reveal') return 'reveal';
  if (game.describer_id === myId) return 'describe';
  if (game.watcher_id === myId) return 'watch';
  return 'guess';
}
