import type { Snapshot } from './snapshot';

/**
 * Lo común del movimiento (docs/PLAN-8.md §3): las animaciones salen de comparar la foto anterior
 * con la nueva, nunca de la acción propia. Cada juego deduce sus eventos con una función pura a
 * partir de la `Transition` que da esta.
 */

/** Duraciones de los tokens de `globals.css`, en ms, para lo que se mueve desde JavaScript. */
export const motionMs = {
  rapido: 120,
  base: 240,
  lento: 420,
  contar: 700,
  /** Contar cuando el número cambia poco. */
  contarCorto: 400,
} as const;

/** Lo que tarda en llegar la tarjeta que entra: sellos y secuencias empiezan entonces. */
export const AFTER_ENTRY_MS = motionMs.lento;

/** Ninguna secuencia dura más (docs/PLAN-8.md §3). */
export const SEQUENCE_MAX_MS = 1600;
/** Escalonado entre pasos de una secuencia, dentro de los 350–520 ms del plan. */
const STAGGER_MS = 420;
/** Los retrasos van en pasos de 20 ms hasta 2,4 s: son las clases `anim-delay-*` que existen. */
const DELAY_STEP_MS = 20;
const MAX_DELAY_MS = 2400;

/** Dos fotos seguidas que se pueden animar. */
export type Transition = { previous: Snapshot; next: Snapshot };

/**
 * La transición que toca animar, o nada: sin foto anterior (carga, recarga, reconexión, vuelta a
 * la pestaña), con movimiento reducido o si las fotos no siguen una a otra.
 */
export function transitionOf(
  previous: Snapshot | null,
  next: Snapshot,
  reduced: boolean,
): Transition | null {
  if (reduced || !previous) return null;
  const transition = { previous, next };
  return isConsecutive(transition) ? transition : null;
}

type Game = NonNullable<Snapshot['game']>;

/** Qué fases pueden seguir a cada una sin saltarse nada. */
const nextPhases: Partial<Record<Game['type'], Record<string, readonly string[]>>> = {
  impostor: {
    talking: ['voting', 'reveal', 'finished'],
    voting: ['reveal', 'finished'],
    reveal: ['talking', 'finished'],
    finished: [],
  },
  // Una salida puede llevar a la ejecución desde cualquier fase con su anuncio de «se ha ido».
  luna_llena: {
    roles: ['night', 'execution', 'finished'],
    night: ['dawn', 'execution', 'finished'],
    dawn: ['hunter', 'mayor', 'day', 'night', 'execution', 'finished'],
    hunter: ['dawn', 'execution', 'mayor', 'day', 'night', 'finished'],
    mayor: ['day', 'execution', 'finished'],
    day: ['voting', 'execution', 'finished'],
    voting: ['defense', 'execution', 'finished'],
    defense: ['execution', 'night', 'finished'],
    execution: ['night', 'hunter', 'finished'],
    finished: [],
  },
  dados: { playing: ['finished'], finished: [] },
};

/** Lo que cuenta el avance de una partida: rondas, noches y días, o dados colocados. */
function progress(game: Game): number {
  switch (game.type) {
    case 'luna_llena':
      return game.night + game.day;
    case 'dados':
      return game.sides.reduce(
        (total, side) => total + side.board.reduce((sum, column) => sum + column.length, 0),
        0,
      );
    default:
      return game.round;
  }
}

type DadosGame = Extract<Game, { type: 'dados' }>;

/** En A dados, la foto sigue a la anterior si no ha pasado nada en la mesa o si ha jugado justo quien tenía el turno. */
function nextTurn(before: DadosGame, after: DadosGame): boolean {
  const mover = before.turn?.user_id;
  if (mover === undefined || mover === after.turn?.user_id) {
    return progress(before) === progress(after);
  }
  const order = before.turn_order;
  return order[(order.indexOf(mover) + 1) % order.length] === after.turn?.user_id;
}

/**
 * Si la foto nueva sigue a la anterior sin saltarse una fase. El detalle de lo que pasa dentro de
 * una fase (un dado colocado, un voto) lo decide cada juego al deducir sus eventos.
 */
export function isConsecutive({ previous, next }: Transition): boolean {
  if (previous.room.id !== next.room.id) return false;
  const before = previous.game;
  const after = next.game;
  if (!before || !after) return true;
  // Partida nueva: solo al volver a jugar desde el resultado.
  if (before.id !== after.id) return before.phase === 'finished';
  if (before.type !== after.type) return false;
  if (before.type === 'dados' && after.type === 'dados' && after.phase === 'playing') {
    return before.phase === 'playing' && nextTurn(before, after);
  }
  if (before.phase === after.phase) return progress(after) - progress(before) <= 1;
  const graph = nextPhases[before.type];
  if (!graph) return Math.abs(progress(after) - progress(before)) <= 1;
  if (!(graph[before.phase] ?? []).includes(after.phase)) return false;
  // En A dados la jugada que acaba la partida coloca un dado; en los demás no se salta ninguna vuelta.
  return before.type === 'dados' || progress(after) - progress(before) <= 1;
}

/**
 * Lo que identifica la pantalla de cada momento: cambia cuando cambia la fase y, en A dados, en
 * cada turno («Cambio de turno», docs/PLAN-8.md §7).
 */
export function stageOf(snapshot: Snapshot): string {
  const game = snapshot.game;
  if (!game) return 'lobby';
  if (game.type === 'dados' && game.phase === 'playing') {
    return `${game.id}:${game.phase}:${String(progress(game))}:${game.turn?.user_id ?? ''}`;
  }
  return `${game.id}:${game.phase}`;
}

/**
 * Si la tarjeta protagonista entra con «Cambio de fase». La noche de El lobo no: la cubre el telón,
 * igual para todos (docs/PLAN-8.md §6).
 */
export function phaseEntry(transition: Transition | null): boolean {
  if (!transition) return false;
  if (stageOf(transition.previous) === stageOf(transition.next)) return false;
  const game = transition.next.game;
  return !(game?.type === 'luna_llena' && game.phase === 'night');
}

/** Ajusta un retraso a los pasos que existen como clase. */
function toStep(ms: number): number {
  const clamped = Math.min(Math.max(ms, 0), MAX_DELAY_MS);
  return clamped - (clamped % DELAY_STEP_MS);
}

/**
 * Cuándo empieza cada paso de una secuencia de `count` elementos que se mueven `duration` ms cada
 * uno, a partir de `start`. Si no cabe en 1,6 s, se acorta el escalonado.
 */
export function sequenceDelays(count: number, duration: number, start = 0): number[] {
  if (count <= 0) return [];
  const room = Math.max(SEQUENCE_MAX_MS - duration - start, 0);
  const stagger = count === 1 ? 0 : Math.min(STAGGER_MS, room / (count - 1));
  return Array.from({ length: count }, (_, index) => toStep(start + index * stagger));
}

/** Clase de Tailwind con el retraso de un paso. */
export function delayClass(ms: number): string {
  return `anim-delay-${String(toStep(ms))}`;
}

/** Cuánto tarda en contar de un número a otro. */
export function countDuration(from: number, to: number): number {
  return Math.abs(to - from) <= 3 ? motionMs.contarCorto : motionMs.contar;
}

/** Cúbica de salida: rápido al principio y frenando al llegar. */
export function easeOutCubic(progress: number): number {
  const t = Math.min(Math.max(progress, 0), 1);
  return 1 - (1 - t) ** 3;
}
