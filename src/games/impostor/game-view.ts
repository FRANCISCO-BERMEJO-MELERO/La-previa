import type { GameState, Snapshot } from '@/lib/snapshot';

/** Datos que pintan las pantallas de partida, deducidos de la foto sin estado propio. */

export type ParticipantView = {
  userId: string;
  name: string;
  /** Posición en el orden de entrada a la sala: decide el color del avatar. */
  joinIndex: number;
  alive: boolean;
  hasVoted: boolean;
  connected: boolean;
};

export function hostName(snapshot: Snapshot): string {
  return snapshot.players.find((player) => player.user_id === snapshot.room.host_id)?.name ?? '';
}

/** Color estable: quien sigue en la sala usa su orden de entrada; quien se fue, el de la partida. */
function joinIndexOf(snapshot: Snapshot, userId: string, fallback: number): number {
  const index = snapshot.players.findIndex((player) => player.user_id === userId);
  return index === -1 ? fallback : index;
}

export function participants(snapshot: Snapshot, game: GameState): ParticipantView[] {
  return game.participants.map((participant, index) => ({
    userId: participant.user_id,
    name: participant.name,
    joinIndex: joinIndexOf(snapshot, participant.user_id, index),
    alive: participant.alive,
    hasVoted: participant.has_voted,
    connected:
      snapshot.players.find((player) => player.user_id === participant.user_id)?.connected ?? false,
  }));
}

export function participant(
  snapshot: Snapshot,
  game: GameState,
  userId: string,
): ParticipantView | undefined {
  return participants(snapshot, game).find((p) => p.userId === userId);
}

/** Vivos que pueden votar a quien llama: todos menos él mismo. */
export function voteCandidates(snapshot: Snapshot, game: GameState): ParticipantView[] {
  return participants(snapshot, game).filter((p) => p.alive && p.userId !== snapshot.me.user_id);
}

export function voteProgress(game: GameState): { voted: number; total: number } {
  const alive = game.participants.filter((p) => p.alive);
  return { voted: alive.filter((p) => p.has_voted).length, total: alive.length };
}

export function aliveCount(game: GameState): number {
  return game.participants.filter((p) => p.alive).length;
}

export function namesOf(snapshot: Snapshot, game: GameState, userIds: readonly string[]): string[] {
  return userIds.map((id) => participant(snapshot, game, id)?.name ?? '').filter((name) => name);
}

export function connectedCount(snapshot: Snapshot): number {
  return snapshot.players.filter((player) => player.connected).length;
}
