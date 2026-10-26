import type { AvatarId } from '@/lib/avatars';
import { copy } from '@/lib/copy';
import type { DadosGameState, DadosSide, DadosSideState, Snapshot } from '@/lib/snapshot';

/** Datos de A dados deducidos de la foto. Los puntos los da el servidor: aquí no se cuentan. */

/** Solo en su columna, en pareja o en trío. */
export type DieTone = 'single' | 'pair' | 'trio';

export function dieTone(column: readonly number[], value: number): DieTone {
  const count = column.filter((die) => die === value).length;
  if (count >= 3) return 'trio';
  return count === 2 ? 'pair' : 'single';
}

/** Arriba el rival y abajo el bando propio; quien mira ve a B arriba y a A abajo. */
export function boardSides(game: DadosGameState): { top: DadosSideState; bottom: DadosSideState } {
  const [a, b] = game.sides;
  return game.my.side === 'B' ? { top: a, bottom: b } : { top: b, bottom: a };
}

export function sideOf(game: DadosGameState, side: DadosSide): DadosSideState {
  return side === 'A' ? game.sides[0] : game.sides[1];
}

function names(side: DadosSideState): string[] {
  return side.members.map((member) => member.name);
}

/** Rótulo de un bando: "Tú", "Tu equipo", el nombre del rival o los nombres de cada equipo. */
export function sideLabel(game: DadosGameState, side: DadosSideState): string {
  if (game.my.side === side.side) return game.mode === '1v1' ? copy.dados.you : copy.dados.yourTeam;
  if (game.mode === '2v2' && !game.my.is_spectator) return copy.dados.team(side.side);
  return copy.dados.names(names(side));
}

/** Nombres accesibles del tablero y de los puntos por columna de un bando. */
export function sideRegions(
  game: DadosGameState,
  side: DadosSideState,
): { board: string; scores: string } {
  if (game.my.side === side.side) {
    return { board: copy.dados.myBoard[game.mode], scores: copy.dados.myScores[game.mode] };
  }
  if (game.mode === '2v2' && !game.my.is_spectator) {
    return { board: copy.dados.teamBoard(side.side), scores: copy.dados.teamScores(side.side) };
  }
  const label = sideLabel(game, side);
  return { board: copy.dados.board(label), scores: copy.dados.scores(label) };
}

/** Nombre de quien tiene el turno. */
export function turnName(game: DadosGameState): string {
  const turn = game.turn;
  if (!turn) return '';
  return (
    game.sides.flatMap((side) => side.members).find((member) => member.user_id === turn.user_id)
      ?.name ?? ''
  );
}

export type TurnStep = { userId: string; name: string; current: boolean };

/** El orden de turnos con quien juega ahora marcado. */
export function turnSteps(game: DadosGameState): TurnStep[] {
  const members = game.sides.flatMap((side) => side.members);
  return game.turn_order.map((userId) => ({
    userId,
    name: members.find((member) => member.user_id === userId)?.name ?? '',
    current: game.turn?.user_id === userId,
  }));
}

export type DadosMember = {
  userId: string;
  name: string;
  joinIndex: number;
  avatar: AvatarId | null;
  /** Desconectado o fuera de la sala. */
  away: boolean;
};

/** Quienes forman un bando, con su avatar de la sala; quien se ha ido sale apagado. */
export function sideMembers(snapshot: Snapshot, side: DadosSideState): DadosMember[] {
  return side.members.map((member, position) => {
    const index = snapshot.players.findIndex((player) => player.user_id === member.user_id);
    const player = snapshot.players[index];
    return {
      userId: member.user_id,
      name: member.name,
      joinIndex: index === -1 ? position : index,
      avatar: player?.avatar ?? null,
      away: !player?.connected,
    };
  });
}

/** Cómo se nombra al bando ganador en una frase: el rival en 1 contra 1, "el equipo A" si no. */
function winnerLabel(game: DadosGameState, side: DadosSideState): string {
  return game.mode === '1v1'
    ? (side.members[0]?.name ?? '')
    : copy.dados.result.teamLabel(side.side);
}

/** Titular del resultado, personal para quien jugaba. */
export function resultTitle(game: DadosGameState): string {
  const winner = game.result?.winner ?? null;
  if (winner === null) return copy.dados.result.tie;
  if (game.my.side === null) return copy.dados.result.wins(winnerLabel(game, sideOf(game, winner)));
  return game.my.side === winner
    ? copy.dados.result.won[game.mode]
    : copy.dados.result.lost[game.mode];
}

/** La línea bajo el titular: el marcador final o quién se fue. */
export function resultSummary(game: DadosGameState): string {
  const result = game.result;
  if (!result) return '';
  const [a, b] = game.sides;
  if (result.winner === null) return copy.dados.result.tieScore(a.total);
  const winner = sideOf(game, result.winner);
  if (result.reason === 'forfeit' && result.left) {
    return copy.dados.result.forfeit(result.left.name, winnerLabel(game, winner));
  }
  const loser = winner === a ? b : a;
  return copy.dados.result.score(names(winner), winner.total, loser.total);
}
