import type { ProbableGameState, Snapshot } from '@/lib/snapshot';

/** Datos que pintan las pantallas de ¿Quién es más probable que…?, deducidos de la foto. */

export type Player = {
  userId: string;
  name: string;
  /** Posición en el orden de entrada a la sala: decide el color del avatar. */
  joinIndex: number;
  active: boolean;
  score: number;
  hasResponded: boolean;
  connected: boolean;
};

export type TallyRow = {
  player: Player;
  votes: number;
  voters: string[];
  winner: boolean;
};

export type RankingRow = { player: Player; position: number; score: number };

export function players(snapshot: Snapshot, game: ProbableGameState): Player[] {
  return game.participants.map((participant, index) => {
    const inRoom = snapshot.players.findIndex((player) => player.user_id === participant.user_id);
    return {
      userId: participant.user_id,
      name: participant.name,
      // Quien ya no está en la sala conserva su sitio en la partida.
      joinIndex: inRoom === -1 ? index : inRoom,
      active: participant.alive,
      score: participant.score,
      hasResponded: participant.has_responded,
      connected: snapshot.players[inRoom]?.connected ?? false,
    };
  });
}

export function activePlayers(snapshot: Snapshot, game: ProbableGameState): Player[] {
  return players(snapshot, game).filter((player) => player.active);
}

function byId(all: Player[], userId: string): Player | undefined {
  return all.find((player) => player.userId === userId);
}

export function playerName(snapshot: Snapshot, game: ProbableGameState, userId: string): string {
  return byId(players(snapshot, game), userId)?.name ?? '';
}

/** Recuento de la revelación con nombres, de más a menos votos. */
export function tallyRows(snapshot: Snapshot, game: ProbableGameState): TallyRow[] {
  const all = players(snapshot, game);
  const winners = game.round_winner_ids ?? [];
  return (game.tally ?? []).flatMap((row) => {
    const player = byId(all, row.user_id);
    if (!player) return [];
    return [
      {
        player,
        votes: row.votes,
        voters: row.voter_ids.map((id) => byId(all, id)?.name ?? '').filter((name) => name),
        winner: winners.includes(row.user_id),
      },
    ];
  });
}

/** Clasificación final; los empatados comparten puesto. */
export function rankingRows(snapshot: Snapshot, game: ProbableGameState): RankingRow[] {
  const all = players(snapshot, game);
  const ranking = game.ranking ?? [];
  return ranking.flatMap((row) => {
    const player = byId(all, row.user_id);
    if (!player) return [];
    const position = 1 + ranking.filter((other) => other.score > row.score).length;
    return [{ player, position, score: row.score }];
  });
}

/** Quienes más puntos tienen; nadie si nadie ha puntuado. */
export function leaders(rows: RankingRow[]): Player[] {
  return rows.filter((row) => row.position === 1 && row.score > 0).map((row) => row.player);
}

export function isLastRound(game: ProbableGameState): boolean {
  return game.round >= game.total_rounds;
}
