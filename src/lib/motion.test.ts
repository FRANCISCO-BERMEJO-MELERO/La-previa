import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  dadosState,
  ids,
  inDados,
  inGame,
  inLuna,
  inProbable,
  lobbySnapshot,
} from '@/test/fixtures';
import {
  SEQUENCE_MAX_MS,
  countDuration,
  delayClass,
  easeOutCubic,
  isConsecutive,
  motionMs,
  phaseEntry,
  sequenceDelays,
  stageOf,
  transitionOf,
} from './motion';
import type { Snapshot } from './snapshot';

function versioned(snapshot: Snapshot, version: number): Snapshot {
  return { ...snapshot, room: { ...snapshot.room, version } };
}

describe('transitionOf', () => {
  const talking = inGame({ phase: 'talking' });
  const voting = versioned(inGame({ phase: 'voting' }), 4);

  it('sin foto anterior no hay nada que animar', () => {
    expect(transitionOf(null, voting, false)).toBeNull();
  });

  it('con movimiento reducido no hay nada que animar', () => {
    expect(transitionOf(talking, voting, true)).toBeNull();
  });

  it('dos fotos seguidas dan la transición', () => {
    expect(transitionOf(talking, voting, false)).toEqual({ previous: talking, next: voting });
  });

  it('una foto que se salta una fase no se anima', () => {
    const reveal = inGame({ phase: 'reveal' });
    const nextRound = inGame({ phase: 'talking', round: 2 });
    expect(transitionOf(talking, reveal, false)).not.toBeNull();
    expect(transitionOf(voting, nextRound, false)).toBeNull();
  });
});

describe('isConsecutive', () => {
  it('de la sala de espera a la partida y de vuelta', () => {
    const lobby = lobbySnapshot();
    const game = inGame();
    expect(isConsecutive({ previous: lobby, next: game })).toBe(true);
    expect(isConsecutive({ previous: game, next: lobby })).toBe(true);
  });

  it('otra sala no sigue a esta', () => {
    const other = lobbySnapshot({ room: { ...lobbySnapshot().room, id: ids.game } });
    expect(isConsecutive({ previous: lobbySnapshot(), next: other })).toBe(false);
  });

  it('una partida nueva solo sigue al resultado', () => {
    const fresh = (phase: 'talking' | 'finished', id: string) =>
      inGame({ phase, ...(id === ids.game ? {} : { id }) });
    const again = fresh('talking', ids.room);
    expect(isConsecutive({ previous: fresh('finished', ids.game), next: again })).toBe(true);
    expect(isConsecutive({ previous: fresh('talking', ids.game), next: again })).toBe(false);
  });

  it('El lobo: de la noche al amanecer sí; de la noche al día no', () => {
    const night = inLuna({ phase: 'night', night: 1, day: 0 });
    expect(isConsecutive({ previous: night, next: inLuna({ phase: 'dawn', night: 1 }) })).toBe(
      true,
    );
    expect(
      isConsecutive({ previous: night, next: inLuna({ phase: 'day', night: 1, day: 1 }) }),
    ).toBe(false);
  });

  it('El lobo: no se salta una noche entera', () => {
    const night = inLuna({ phase: 'night', night: 1, day: 0 });
    const later = inLuna({ phase: 'night', night: 2, day: 1 });
    expect(isConsecutive({ previous: night, next: later })).toBe(false);
  });

  it('A dados: sigue si ha jugado quien tenía el turno y no si se ha saltado uno', () => {
    const before = inDados();
    const after = inDados({
      turn: { user_id: ids.lucia, side: 'B' },
      sides: dadosState().sides,
    });
    const untouched = inDados({ pending_die: 2 });
    expect(isConsecutive({ previous: before, next: after })).toBe(true);
    expect(isConsecutive({ previous: before, next: untouched })).toBe(true);
    const moved = inDados({
      sides: [{ ...dadosState().sides[0], board: [[4, 5], [5, 5, 4], [3]] }, dadosState().sides[1]],
    });
    expect(isConsecutive({ previous: before, next: moved })).toBe(false);
  });

  it('los juegos por rondas no se saltan una ronda', () => {
    const one = inProbable({ phase: 'voting', round: 1 });
    expect(isConsecutive({ previous: one, next: inProbable({ phase: 'reveal', round: 1 }) })).toBe(
      true,
    );
    expect(isConsecutive({ previous: one, next: inProbable({ phase: 'voting', round: 3 }) })).toBe(
      false,
    );
  });
});

describe('stageOf y phaseEntry', () => {
  it('la sala de espera es un momento y cada fase otro', () => {
    expect(stageOf(lobbySnapshot())).toBe('lobby');
    expect(stageOf(inGame({ phase: 'talking' }))).not.toBe(stageOf(inGame({ phase: 'voting' })));
  });

  it('en A dados cada turno es un momento', () => {
    const next = inDados({ turn: { user_id: ids.lucia, side: 'B' } });
    expect(stageOf(inDados())).not.toBe(stageOf(next));
  });

  it('entra la tarjeta al cambiar de fase, no dentro de la misma', () => {
    const talking = inGame({ phase: 'talking' });
    const voting = inGame({ phase: 'voting' });
    expect(phaseEntry({ previous: talking, next: voting })).toBe(true);
    expect(phaseEntry({ previous: voting, next: voting })).toBe(false);
    expect(phaseEntry(null)).toBe(false);
  });

  it('la noche de El lobo no entra con tarjeta: la cubre el telón', () => {
    const roles = inLuna({ phase: 'roles', night: 0 });
    const night = inLuna({ phase: 'night', night: 1 });
    expect(phaseEntry({ previous: roles, next: night })).toBe(false);
    expect(phaseEntry({ previous: night, next: inLuna({ phase: 'dawn', night: 1 }) })).toBe(true);
  });
});

describe('sequenceDelays', () => {
  it('escalona dentro de los 350–520 ms cuando cabe', () => {
    const delays = sequenceDelays(3, motionMs.base);
    expect(delays[0]).toBe(0);
    const step = (delays[1] ?? 0) - (delays[0] ?? 0);
    expect(step).toBeGreaterThanOrEqual(350);
    expect(step).toBeLessThanOrEqual(520);
  });

  it.each([1, 2, 5, 8, 16, 40])('con %i pasos ninguna secuencia supera 1,6 s', (count) => {
    for (const start of [0, 300]) {
      const delays = sequenceDelays(count, motionMs.lento, start);
      expect(delays).toHaveLength(count);
      expect(Math.max(...delays) + motionMs.lento).toBeLessThanOrEqual(SEQUENCE_MAX_MS);
    }
  });

  it('los retrasos son clases que existen', () => {
    for (const delay of sequenceDelays(16, motionMs.base, 100)) expect(delay % 20).toBe(0);
    expect(delayClass(433)).toBe('anim-delay-420');
    expect(delayClass(5000)).toBe('anim-delay-2400');
  });
});

describe('contar', () => {
  it('los cambios pequeños cuentan más deprisa', () => {
    expect(countDuration(4, 6)).toBe(motionMs.contarCorto);
    expect(countDuration(4, 40)).toBe(motionMs.contar);
  });

  it('la cúbica de salida va de 0 a 1 frenando', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(2)).toBe(1);
  });
});

describe('tokens de movimiento', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

  it('las duraciones valen lo mismo en CSS y en JavaScript', () => {
    expect(motionMs).toMatchObject({ rapido: 120, base: 240, lento: 420, contar: 700 });
    for (const [name, ms] of [
      ['rapido', motionMs.rapido],
      ['base', motionMs.base],
      ['lento', motionMs.lento],
      ['contar', motionMs.contar],
    ] as const) {
      expect(css).toContain(`--duration-${name}: ${String(ms)}ms;`);
    }
  });

  it('define las curvas del plan', () => {
    expect(css).toContain('--ease-golpe: cubic-bezier(0.2, 0.8, 0.3, 1.3);');
    expect(css).toContain('--ease-seco: cubic-bezier(0.3, 0, 0.2, 1);');
    expect(css).toContain('--ease-salida: cubic-bezier(0.5, 0, 1, 0.5);');
  });

  it('con movimiento reducido no se anima nada', () => {
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\*,\s*::before,\s*::after\s*\{\s*animation: none !important;/,
    );
  });
});
