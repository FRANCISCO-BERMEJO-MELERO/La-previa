import { describe, expect, it } from 'vitest';
import { lunaMy, lunaState } from '@/test/fixtures';
import { viewFor } from './view';

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
    ['execution', 'execution'],
  ] as const)('un vivo en %s ve %s', (phase, view) => {
    expect(viewFor(lunaState({ phase }))).toBe(view);
  });

  it('al terminar todos ven el resultado, vivos, muertos y quien llegó tarde', () => {
    expect(viewFor(lunaState({ phase: 'finished' }))).toBe('result');
    expect(viewFor(lunaState({ phase: 'finished', my: lunaMy({ alive: false }) }))).toBe('result');
    expect(
      viewFor(
        lunaState({ phase: 'finished', my: lunaMy({ is_participant: false, alive: false }) }),
      ),
    ).toBe('result');
  });

  it('quien llegó tarde espera a la siguiente partida', () => {
    const late = lunaMy({ is_participant: false, alive: false, role: null });
    expect(viewFor(lunaState({ my: late }))).toBe('late');
    expect(viewFor(lunaState({ phase: 'hunter', my: late }))).toBe('late');
  });

  it('un muerto pasa a espectador en cualquier fase', () => {
    for (const phase of ['night', 'dawn', 'day', 'hunter'] as const) {
      expect(viewFor(lunaState({ phase, my: lunaMy({ alive: false }) }))).toBe('spectator');
    }
  });

  it('el cazador muerto elige a quién se lleva', () => {
    const hunter = lunaMy({ alive: false, role: 'hunter' });
    expect(viewFor(lunaState({ phase: 'hunter', my: hunter }))).toBe('hunter_shoot');
    expect(viewFor(lunaState({ phase: 'dawn', my: hunter }))).toBe('spectator');
  });
});
