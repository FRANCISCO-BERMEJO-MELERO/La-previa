import { describe, expect, it } from 'vitest';
import {
  configProblem,
  maxWolves,
  recommendedConfig,
  toggleRole,
  villagerCount,
} from './composition';

describe('composición de El lobo', () => {
  it('la recomendada sigue la tabla del plan', () => {
    expect(recommendedConfig(4)).toEqual({ wolves: 1, roles: [] });
    expect(recommendedConfig(6)).toEqual({ wolves: 1, roles: [] });
    expect(recommendedConfig(8)).toEqual({ wolves: 2, roles: ['protector'] });
    expect(recommendedConfig(9)).toEqual({ wolves: 2, roles: ['protector', 'hunter'] });
    expect(recommendedConfig(13)).toEqual({ wolves: 3, roles: ['protector', 'hunter', 'jester'] });
    expect(recommendedConfig(16)).toEqual({
      wolves: 3,
      roles: ['protector', 'hunter', 'jester', 'cupid'],
    });
  });

  it('la recomendada es válida de 4 a 16 jugadores', () => {
    for (let players = 4; players <= 16; players += 1) {
      expect(configProblem(players, recommendedConfig(players))).toBeNull();
    }
  });

  it('cuenta los aldeanos que quedan', () => {
    expect(villagerCount(9, { wolves: 2, roles: ['protector', 'hunter'] })).toBe(4);
  });

  it('dice por qué una composición no vale', () => {
    expect(configProblem(8, { wolves: 4, roles: [] })).toBe('too_many_wolves');
    expect(configProblem(6, { wolves: 2, roles: ['protector', 'hunter', 'jester'] })).toBe(
      'no_villager',
    );
    expect(configProblem(6, { wolves: 2, roles: ['protector', 'hunter'] })).toBeNull();
  });

  it('los lobos siempre son menos de la mitad', () => {
    expect(maxWolves(6)).toBe(2);
    expect(maxWolves(7)).toBe(3);
    expect(maxWolves(16)).toBe(7);
    expect(maxWolves(2)).toBe(1);
  });

  it('activar un rol lo deja en su orden y desactivarlo lo quita', () => {
    expect(toggleRole({ wolves: 1, roles: ['jester'] }, 'protector').roles).toEqual([
      'protector',
      'jester',
    ]);
    expect(toggleRole({ wolves: 1, roles: ['protector', 'jester'] }, 'protector').roles).toEqual([
      'jester',
    ]);
  });
});
