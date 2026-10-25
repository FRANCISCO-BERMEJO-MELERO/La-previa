import type { DadosGameState } from '@/lib/snapshot';

/** Pantallas de A dados (docs/PLAN-7.md §6). */
export type DadosView =
  | 'my_turn' // te toca colocar el dado
  | 'waiting' // juegas, pero le toca a otro
  | 'spectator' // miras la partida
  | 'result'; // marcador final

export function viewFor(game: DadosGameState): DadosView {
  if (game.phase === 'finished') return 'result';
  if (game.my.is_spectator) return 'spectator';
  return game.my.is_my_turn ? 'my_turn' : 'waiting';
}
