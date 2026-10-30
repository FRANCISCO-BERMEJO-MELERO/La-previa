import type { Transition } from '@/lib/motion';
import type { DadosGameState, DadosSide, DadosSideState } from '@/lib/snapshot';

/** La tirada rueda medio segundo y cambia de cara cada 75 ms (docs/PLAN-8.md §7). */
export const ROLL_MS = 500;
export const FACE_MS = 75;

/**
 * Lo que se anima en A dados (docs/PLAN-8.md §7), deducido de la jugada que separa dos fotos. En
 * A dados no hay nada secreto: todos ven la misma mesa.
 */
export type DadosMotion =
  /** Un dado pendiente nuevo: la tirada. */
  | { type: 'roll' }
  /** El dado colocado, en su bando, columna y hueco. */
  | { type: 'place'; side: DadosSide; column: number; slot: number }
  /** Pareja o trío en la columna donde se ha colocado. */
  | { type: 'combo'; side: DadosSide; column: number; count: 2 | 3 }
  /** Los dados que se rompen al rival: en qué huecos estaban, qué valían y cuánto pierde. */
  | {
      type: 'attack';
      side: DadosSide;
      column: number;
      removed: { slot: number; value: number }[];
      lost: number;
    }
  | { type: 'result' };

function sideOf(game: DadosGameState, side: DadosSide): DadosSideState {
  return side === 'A' ? game.sides[0] : game.sides[1];
}

/** La columna donde ha caído un dado: la única que ha crecido en uno sin tocar lo que había. */
function placedColumn(before: DadosSideState, after: DadosSideState): number | null {
  const index = after.board.findIndex((column, at) => {
    const old = before.board[at] ?? [];
    return column.length === old.length + 1 && old.every((die, slot) => column[slot] === die);
  });
  return index === -1 ? null : index;
}

function play(before: DadosGameState, after: DadosGameState): DadosMotion[] {
  const mover = before.turn?.side;
  if (!mover || before.phase !== 'playing') return [];
  const rival: DadosSide = mover === 'A' ? 'B' : 'A';
  const column = placedColumn(sideOf(before, mover), sideOf(after, mover));
  if (column === null) return [];
  const placed = sideOf(after, mover).board[column] ?? [];
  const value = placed.at(-1);
  if (value === undefined) return [];
  const events: DadosMotion[] = [{ type: 'place', side: mover, column, slot: placed.length - 1 }];
  const same = placed.filter((die) => die === value).length;
  if (same === 2 || same === 3) events.push({ type: 'combo', side: mover, column, count: same });

  const rivalBefore = sideOf(before, rival);
  const removed = (rivalBefore.board[column] ?? []).flatMap((die, slot) =>
    die === value ? [{ slot, value: die }] : [],
  );
  if (removed.length > 0) {
    const lost =
      (rivalBefore.column_scores[column] ?? 0) - (sideOf(after, rival).column_scores[column] ?? 0);
    events.push({ type: 'attack', side: rival, column, removed, lost });
  }
  return events;
}

export function dadosMotion(transition: Transition | null): DadosMotion[] {
  if (!transition) return [];
  const before = transition.previous.game;
  const after = transition.next.game;
  if (after?.type !== 'dados') return [];
  const roll: DadosMotion[] =
    after.pending_die !== null && after.phase === 'playing' ? [{ type: 'roll' }] : [];
  // Al empezar la partida solo se tira el primer dado.
  if (before?.type !== 'dados' || before.id !== after.id) return roll;
  const moved = play(before, after);
  if (moved.length === 0) return [];
  return [...moved, ...roll, ...(after.phase === 'finished' ? [{ type: 'result' } as const] : [])];
}

/** Lo que se mueve en el tablero y los marcadores de un bando. */
export type SideMotion = {
  placed: { column: number; slot: number } | null;
  combo: { column: number; count: 2 | 3 } | null;
  attack: { column: number; removed: { slot: number; value: number }[]; lost: number } | null;
  /** Los puntos de la foto anterior, para contar desde ellos. */
  from: { columns: readonly number[]; total: number } | null;
};

export const stillSide: SideMotion = { placed: null, combo: null, attack: null, from: null };

/** Lo que toca mover en el bando dado, a partir de los eventos y de la foto anterior. */
export function sideMotion(
  events: readonly DadosMotion[],
  side: DadosSide,
  previous: DadosGameState | null,
): SideMotion {
  let motion = stillSide;
  for (const event of events) {
    if (event.type === 'place' && event.side === side) {
      motion = { ...motion, placed: { column: event.column, slot: event.slot } };
    }
    if (event.type === 'combo' && event.side === side) {
      motion = { ...motion, combo: { column: event.column, count: event.count } };
    }
    if (event.type === 'attack' && event.side === side) {
      const { column, removed, lost } = event;
      motion = { ...motion, attack: { column, removed, lost } };
    }
  }
  const before = previous ? sideOf(previous, side) : null;
  const moved = events.some((event) => event.type === 'place');
  return moved && before
    ? { ...motion, from: { columns: before.column_scores, total: before.total } }
    : motion;
}
