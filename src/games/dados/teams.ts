import type { DadosTeams } from '@/lib/actions';
import type { DadosMode, RoomPlayer } from '@/lib/snapshot';

/** Lo que el anfitrión elige para cada miembro en la sala de espera. */
export type DadosChoice = 'A' | 'B' | 'watch';

/** Elecciones que ha cambiado el anfitrión, por jugador; el resto sigue el reparto por defecto. */
export type DadosAssignment = Readonly<Record<string, DadosChoice>>;

export const DADOS_CHOICES = ['A', 'B', 'watch'] as const satisfies readonly DadosChoice[];

/** Con menos de dos no hay ni un 1 contra 1. */
export const MIN_DADOS_PLAYERS = 2;

export function teamSize(mode: DadosMode): number {
  return mode === '1v1' ? 1 : 2;
}

/** Por defecto juegan los primeros por orden de entrada, alternando A y B; el resto mira. */
function defaultChoice(index: number, mode: DadosMode): DadosChoice {
  if (index >= 2 * teamSize(mode)) return 'watch';
  return index % 2 === 0 ? 'A' : 'B';
}

/** La elección de cada jugador de la sala, en su orden. */
export function choicesFor(
  players: readonly RoomPlayer[],
  mode: DadosMode,
  assignment: DadosAssignment,
): DadosChoice[] {
  return players.map((player, index) => assignment[player.user_id] ?? defaultChoice(index, mode));
}

export function teamsFrom(
  players: readonly RoomPlayer[],
  choices: readonly DadosChoice[],
): DadosTeams {
  const of = (side: 'A' | 'B') =>
    players.filter((_, index) => choices[index] === side).map((player) => player.user_id);
  return { A: of('A'), B: of('B') };
}

/** Los dos equipos tienen justo las personas que pide la modalidad. */
export function teamsReady(mode: DadosMode, teams: DadosTeams): boolean {
  const size = teamSize(mode);
  return teams.A.length === size && teams.B.length === size;
}
