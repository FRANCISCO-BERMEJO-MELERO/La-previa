import type { Transition } from './motion';

/**
 * Quienes acaban de entrar en la sala de espera (docs/PLAN-8.md §4). Quien se va desaparece sin
 * animación, así que solo cuentan las llegadas.
 */
export function joinedPlayers(transition: Transition | null): string[] {
  if (!transition) return [];
  const { previous, next } = transition;
  if (previous.game || next.game) return [];
  const known = new Set(previous.players.map((player) => player.user_id));
  return next.players.filter((player) => !known.has(player.user_id)).map((p) => p.user_id);
}
