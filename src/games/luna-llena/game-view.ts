import type { AvatarId } from '@/lib/avatars';
import type { LunaLlenaGameState, Snapshot } from '@/lib/snapshot';
import type { LunaRole } from './roles';

/** Datos de Luna llena que necesitan las pantallas, deducidos de la foto. */

export type LunaPlayer = {
  userId: string;
  name: string;
  /** Posición en el orden de entrada a la sala: decide el color del avatar. */
  joinIndex: number;
  avatar: AvatarId | null;
  connected: boolean;
  alive: boolean;
  hasActed: boolean;
  /** Solo el de los muertos, y el de todos al terminar. */
  role: LunaRole | null;
};

export function lunaPlayers(snapshot: Snapshot, game: LunaLlenaGameState): LunaPlayer[] {
  return game.participants.map((participant, index) => {
    const inRoom = snapshot.players.findIndex((player) => player.user_id === participant.user_id);
    return {
      userId: participant.user_id,
      name: participant.name,
      // Quien ya no está en la sala conserva su sitio en la partida.
      joinIndex: inRoom === -1 ? index : inRoom,
      avatar: snapshot.players[inRoom]?.avatar ?? null,
      connected: snapshot.players[inRoom]?.connected ?? false,
      alive: participant.alive,
      hasActed: participant.has_acted,
      role: participant.role,
    };
  });
}

export function nameOf(players: readonly LunaPlayer[], userId: string | null): string {
  return players.find((player) => player.userId === userId)?.name ?? '';
}

export function namesOf(players: readonly LunaPlayer[], userIds: readonly string[]): string[] {
  return userIds.map((userId) => nameOf(players, userId));
}

/** Vivos que aún no han hecho lo que pide la fase. */
export function pendingCount(players: readonly LunaPlayer[]): number {
  return players.filter((player) => player.alive && !player.hasActed).length;
}

/** Qué hace cada uno de noche: Cupido enlaza solo la primera; luego sospecha como el resto. */
export type NightMode = 'wolf' | 'seer' | 'protector' | 'cupid' | 'suspect';

export function nightMode(game: LunaLlenaGameState): NightMode {
  switch (game.my.role) {
    case 'wolf':
    case 'seer':
    case 'protector':
      return game.my.role;
    case 'cupid':
      return game.night === 1 ? 'cupid' : 'suspect';
    default:
      return 'suspect';
  }
}

/** A quién puede elegir esta noche quien llama, según su rol. */
export function nightCandidates(
  game: LunaLlenaGameState,
  players: readonly LunaPlayer[],
  myId: string,
): LunaPlayer[] {
  const alive = players.filter((player) => player.alive);
  switch (nightMode(game)) {
    case 'wolf':
      return alive.filter(
        (player) => player.userId !== myId && !game.my.fellow_wolves.includes(player.userId),
      );
    case 'protector':
      return alive.filter((player) => player.userId !== game.my.last_protected_id);
    case 'cupid':
      return alive;
    case 'seer':
    case 'suspect':
      return alive.filter((player) => player.userId !== myId);
  }
}

/** Para un lobo: qué lobos marcan a cada jugador, por nombre. */
export function packMarks(
  game: LunaLlenaGameState,
  players: readonly LunaPlayer[],
): Map<string, string[]> {
  const marks = new Map<string, string[]>();
  for (const mark of game.my.wolf_marks) {
    marks.set(mark.target_id, [
      ...(marks.get(mark.target_id) ?? []),
      nameOf(players, mark.user_id),
    ]);
  }
  return marks;
}
