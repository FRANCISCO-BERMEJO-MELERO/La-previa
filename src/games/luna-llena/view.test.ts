import { describe, expect, it } from 'vitest';
import { lunaIds, lunaMy, lunaState } from '@/test/fixtures';
import { viewFor } from './view';

const me = lunaIds.fran;

describe('viewFor de Luna llena', () => {
  it.each([
    ['roles', 'roles'],
    ['night', 'night'],
    ['dawn', 'dawn'],
    ['hunter', 'hunter_wait'],
    ['mayor', 'mayor'],
    ['day', 'day'],
    ['voting', 'voting'],
    ['defense', 'defense'],
    ['verdict', 'verdict'],
    ['execution', 'execution'],
  ] as const)('un vivo en %s ve %s', (phase, view) => {
    expect(viewFor(lunaState({ phase }), me)).toBe(view);
  });

  it('al terminar todos ven el resultado, vivos, muertos y quien llegó tarde', () => {
    expect(viewFor(lunaState({ phase: 'finished' }), me)).toBe('result');
    expect(viewFor(lunaState({ phase: 'finished', my: lunaMy({ alive: false }) }), me)).toBe(
      'result',
    );
    expect(
      viewFor(
        lunaState({ phase: 'finished', my: lunaMy({ is_participant: false, alive: false }) }),
        me,
      ),
    ).toBe('result');
  });

  it('quien llegó tarde espera a la siguiente partida', () => {
    const late = lunaMy({ is_participant: false, alive: false, role: null });
    expect(viewFor(lunaState({ my: late }), me)).toBe('late');
    expect(viewFor(lunaState({ phase: 'hunter', my: late }), me)).toBe('late');
  });

  it('un muerto pasa a espectador en cualquier fase', () => {
    for (const phase of ['night', 'dawn', 'day', 'verdict', 'hunter'] as const) {
      expect(viewFor(lunaState({ phase, my: lunaMy({ alive: false }) }), me)).toBe('spectator');
    }
  });

  it('el cazador muerto elige a quién se lleva', () => {
    const hunter = lunaMy({ alive: false, role: 'hunter' });
    expect(viewFor(lunaState({ phase: 'hunter', my: hunter }), me)).toBe('hunter_shoot');
    expect(viewFor(lunaState({ phase: 'dawn', my: hunter }), me)).toBe('spectator');
  });

  it('el acusado espera el veredicto sin votar', () => {
    expect(viewFor(lunaState({ phase: 'verdict', accused_id: me }), me)).toBe('verdict_accused');
    expect(viewFor(lunaState({ phase: 'verdict', accused_id: lunaIds.lucia }), me)).toBe('verdict');
  });
});
