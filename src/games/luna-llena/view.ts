import type { LunaLlenaGameState } from '@/lib/snapshot';

/** Pantallas de Luna llena (docs/PLAN-5.md §9). */
export type LunaLlenaView =
  | 'late' // entra en la siguiente partida
  | 'roles' // la carta
  | 'night' // actuar según el rol o esperar al amanecer
  | 'dawn' // quién ha muerto esta noche
  | 'hunter_shoot' // el cazador muerto elige a quién se lleva
  | 'hunter_wait' // los demás esperan el disparo
  | 'mayor' // elegir alcalde
  | 'day' // móviles boca abajo
  | 'voting' // acusar
  | 'defense' // quién votó a quién
  | 'verdict' // condenar o salvar
  | 'verdict_accused' // el acusado espera el veredicto
  | 'execution' // el veredicto y su resultado
  | 'spectator' // los muertos lo ven todo
  | 'result'; // bando ganador y todos los roles

export function viewFor(game: LunaLlenaGameState, myId: string): LunaLlenaView {
  if (game.phase === 'finished') return 'result';
  if (!game.my.is_participant) return 'late';
  // El cazador ya está muerto cuando dispara.
  if (game.phase === 'hunter' && game.my.role === 'hunter' && !game.my.alive) return 'hunter_shoot';
  if (!game.my.alive) return 'spectator';

  switch (game.phase) {
    case 'roles':
    case 'night':
    case 'dawn':
    case 'mayor':
    case 'day':
    case 'voting':
    case 'defense':
    case 'execution':
      return game.phase;
    case 'hunter':
      return 'hunter_wait';
    case 'verdict':
      return game.accused_id === myId ? 'verdict_accused' : 'verdict';
  }
}
