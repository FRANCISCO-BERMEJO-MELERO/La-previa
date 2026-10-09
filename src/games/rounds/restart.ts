import { backToLobby, type ActionResult } from '@/lib/actions';
import type { Snapshot } from '@/lib/snapshot';

/** Volver a jugar; si se ha ido gente y ya no hay bastantes, se vuelve a la sala de espera. */
export async function restartOrLobby(
  roomId: string,
  start: () => Promise<ActionResult<Snapshot>>,
): Promise<ActionResult<Snapshot>> {
  const again = await start();
  return !again.ok && again.error === 'not_enough_players' ? backToLobby(roomId) : again;
}
