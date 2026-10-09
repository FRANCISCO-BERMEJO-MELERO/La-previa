import type { Snapshot } from '@/lib/snapshot';

/** Pantallas de la sala según docs/CONTEXTO.md §6. La 01 y la 02 viven fuera de la sala. */
export type RoomView =
  | 'lobby' // 04 (la 03 es una subvista local de la sala de espera)
  | 'late' // 05
  | 'deal_player' // 06
  | 'deal_impostor' // 07
  | 'vote' // 08
  | 'vote_wait' // 09
  | 'reveal' // 10
  | 'tie' // 11
  | 'out' // 12
  | 'won' // 13
  | 'lost' // 14
  | 'result_spectator'; // resultado para quien llegó tarde

export function viewFor(snapshot: Snapshot): RoomView {
  const { game } = snapshot;
  if (!game) return 'lobby';

  const { my } = game;
  if (!my.is_participant) return game.phase === 'finished' ? 'result_spectator' : 'late';

  switch (game.phase) {
    case 'talking':
      if (!my.alive) return 'out';
      return my.role === 'impostor' ? 'deal_impostor' : 'deal_player';
    case 'voting':
      if (!my.alive) return 'out';
      return my.voted_for === null ? 'vote' : 'vote_wait';
    case 'reveal':
      return game.outcome?.type === 'tie' ? 'tie' : 'reveal';
    case 'finished': {
      const mySide = my.role === 'impostor' ? 'impostors' : 'group';
      return game.result?.winner === mySide ? 'won' : 'lost';
    }
  }
}
