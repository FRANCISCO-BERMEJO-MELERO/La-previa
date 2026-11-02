import { backToLobby, type ActionResult } from '@/lib/actions';
import type { Snapshot } from '@/lib/snapshot';

/**
 * Volver a jugar; si se ha ido gente y ya no hay bastantes, o en Cuela la mentira ha entrado gente
 * y sobra, se vuelve a la sala de espera, que explica qué pasa.
 */
export async function restartOrLobby(
  roomId: string,
  start: () => Promise<ActionResult<Snapshot>>,
): Promise<ActionResult<Snapshot>> {
  const again = await start();
  return !again.ok && (again.error === 'not_enough_players' || again.error === 'too_many_players')
    ? backToLobby(roomId)
    : again;
}
