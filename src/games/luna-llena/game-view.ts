import type { AvatarId } from '@/lib/avatars';
import { copy } from '@/lib/copy';
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

/** El alcalde, mientras vive. */
export function liveMayorId(
  game: LunaLlenaGameState,
  players: readonly LunaPlayer[],
): string | null {
  return players.find((player) => player.userId === game.mayor_id && player.alive)?.userId ?? null;
}

export type AccuseGroup = {
  targetId: string;
  name: string;
  /** Votos contando doble el del alcalde. */
  weight: number;
  voters: { name: string; double: boolean }[];
};

/** Votos de la acusación agrupados por acusado, del más votado al menos. */
export function accuseGroups(
  game: LunaLlenaGameState,
  players: readonly LunaPlayer[],
): AccuseGroup[] {
  if (game.public_votes?.kind !== 'accuse') return [];
  const groups = new Map<string, AccuseGroup>();
  for (const vote of game.public_votes.votes) {
    if (!vote.target_id) continue;
    const double = vote.voter_id === game.mayor_id;
    const group = groups.get(vote.target_id) ?? {
      targetId: vote.target_id,
      name: nameOf(players, vote.target_id),
      weight: 0,
      voters: [],
    };
    group.weight += double ? 2 : 1;
    group.voters.push({ name: nameOf(players, vote.voter_id), double });
    groups.set(vote.target_id, group);
  }
  return [...groups.values()].sort((a, b) => b.weight - a.weight);
}

/** Quién votó condenar y quién salvar, con el alcalde marcado. */
export function verdictSides(
  game: LunaLlenaGameState,
  players: readonly LunaPlayer[],
): { condemn: string[]; spare: string[] } | null {
  if (game.public_votes?.kind !== 'verdict') return null;
  const label = (voterId: string) =>
    voterId === game.mayor_id
      ? `${nameOf(players, voterId)} ${copy.lunaLlena.defense.double}`
      : nameOf(players, voterId);
  const votes = game.public_votes.votes;
  return {
    condemn: votes.filter((vote) => vote.condemn === true).map((vote) => label(vote.voter_id)),
    spare: votes.filter((vote) => vote.condemn === false).map((vote) => label(vote.voter_id)),
  };
}
