import { describe, expect, it } from 'vitest';
import { transitionOf } from '@/lib/motion';
import type { DadosGameState, Snapshot } from '@/lib/snapshot';
import { dadosState, ids, inDados } from '@/test/fixtures';
import { dadosMotion } from './motion';

const [sideA, sideB] = dadosState().sides;

function motion(previous: Snapshot, next: Snapshot) {
  return dadosMotion(transitionOf(previous, next, false));
}

/** Tras el 5 de Fran en la columna 2: Lucía tenía un 2 ahí, no pierde nada; ahora le toca a ella. */
function afterFran(overrides: Partial<DadosGameState> = {}): Snapshot {
  return inDados({
    turn: { user_id: ids.lucia, side: 'B' },
    pending_die: 2,
    my: { side: 'A', is_spectator: false, is_my_turn: false },
    ...overrides,
  });
}

describe('dadosMotion', () => {
  it('colocar un dado: sube a su hueco y se tira el siguiente', () => {
    const next = afterFran({
      sides: [
        { ...sideA, board: [[4, 5], [5, 5, 4], [3]], column_scores: [9, 24, 3], total: 36 },
        sideB,
      ],
    });
    expect(motion(inDados(), next)).toEqual([
      { type: 'place', side: 'A', column: 0, slot: 1 },
      { type: 'roll' },
    ]);
  });

  it('pareja o trío en la columna', () => {
    const next = afterFran({
      sides: [
        { ...sideA, board: [[4], [5, 5, 4], [3, 3]], column_scores: [4, 24, 12], total: 40 },
        sideB,
      ],
    });
    const before = inDados({ pending_die: 3 });
    expect(motion(before, next)).toContainEqual({ type: 'combo', side: 'A', column: 2, count: 2 });
  });

  it('ataque: los dados iguales del rival en esa columna revientan y se dice cuánto pierde', () => {
    const before = inDados({ pending_die: 6 });
    const next = afterFran({
      sides: [
        { ...sideA, board: [[4, 6], [5, 5, 4], [3]], column_scores: [10, 24, 3], total: 37 },
        { ...sideB, board: [[], [2], []], column_scores: [0, 2, 0], total: 2 },
      ],
    });
    expect(motion(before, next)).toContainEqual({
      type: 'attack',
      side: 'B',
      column: 0,
      removed: [
        { slot: 0, value: 6 },
        { slot: 1, value: 6 },
      ],
      lost: 24,
    });
  });

  it('la jugada que acaba la partida da el resultado y no tira otro dado', () => {
    const next = inDados({
      phase: 'finished',
      turn: null,
      pending_die: null,
      sides: [
        { ...sideA, board: [[4, 5], [5, 5, 4], [3]], column_scores: [9, 24, 3], total: 36 },
        sideB,
      ],
      result: { winner: 'A', reason: 'board_full', left: null },
    });
    const events = motion(inDados(), next);
    expect(events).toContainEqual({ type: 'result' });
    expect(events).not.toContainEqual({ type: 'roll' });
  });

  it('al empezar se tira el primer dado', () => {
    expect(motion(inDados({}, { game: null }), inDados())).toEqual([{ type: 'roll' }]);
  });

  it('nada en la primera foto, con movimiento reducido ni si se ha saltado un turno', () => {
    const next = afterFran({
      sides: [
        { ...sideA, board: [[4, 5], [5, 5, 4], [3]], column_scores: [9, 24, 3], total: 36 },
        sideB,
      ],
    });
    expect(dadosMotion(transitionOf(null, next, false))).toEqual([]);
    expect(dadosMotion(transitionOf(inDados(), next, true))).toEqual([]);
    const twoTurns = inDados({
      pending_die: 1,
      sides: [
        { ...sideA, board: [[4, 5], [5, 5, 4], [3]], column_scores: [9, 24, 3], total: 36 },
        { ...sideB, board: [[6, 6], [2], [2]], column_scores: [24, 2, 2], total: 28 },
      ],
    });
    expect(motion(inDados(), twoTurns)).toEqual([]);
  });
});
