import type { AvatarId } from '@/lib/avatars';
import type { RoundGameState, Snapshot } from '@/lib/snapshot';

/** Datos que comparten las pantallas de los juegos por rondas, deducidos de la foto. */

export type Player = {
  userId: string;
  name: string;
  /** Posición en el orden de entrada a la sala: decide el color del avatar. */
  joinIndex: number;
  /** El de la galería si lo ha elegido y sigue en la sala. */
  avatar?: AvatarId | null;
  active: boolean;
  score: number;
  hasResponded: boolean;
  connected: boolean;
};

export type RankingRow = { player: Player; position: number; score: number };

export function players(snapshot: Snapshot, game: RoundGameState): Player[] {
  return game.participants.map((participant, index) => {
    const inRoom = snapshot.players.findIndex((player) => player.user_id === participant.user_id);
    return {
      userId: participant.user_id,
      name: participant.name,
      // Quien ya no está en la sala conserva su sitio en la partida.
      joinIndex: inRoom === -1 ? index : inRoom,
      avatar: snapshot.players[inRoom]?.avatar ?? null,
      active: participant.alive,
      score: participant.score,
      hasResponded: participant.has_responded,
      connected: snapshot.players[inRoom]?.connected ?? false,
    };
  });
}

export function activePlayers(snapshot: Snapshot, game: RoundGameState): Player[] {
  return players(snapshot, game).filter((player) => player.active);
}

export function playerById(all: Player[], userId: string): Player | undefined {
  return all.find((player) => player.userId === userId);
}

export function playerName(snapshot: Snapshot, game: RoundGameState, userId: string): string {
  return playerById(players(snapshot, game), userId)?.name ?? '';
}

export function hostName(snapshot: Snapshot): string {
  return snapshot.players.find((player) => player.user_id === snapshot.room.host_id)?.name ?? '';
}

/** Clasificación final; los empatados comparten puesto. */
export function rankingRows(snapshot: Snapshot, game: RoundGameState): RankingRow[] {
  const all = players(snapshot, game);
  const ranking = game.ranking ?? [];
  return ranking.flatMap((row) => {
    const player = playerById(all, row.user_id);
    if (!player) return [];
    const position = 1 + ranking.filter((other) => other.score > row.score).length;
    return [{ player, position, score: row.score }];
  });
}

/** Quienes más puntos tienen; nadie si nadie ha puntuado. */
export function leaders(rows: RankingRow[]): Player[] {
  return rows.filter((row) => row.position === 1 && row.score > 0).map((row) => row.player);
}

export function isLastRound(game: RoundGameState): boolean {
  return game.round >= game.total_rounds;
}
