import { describe, expect, it } from 'vitest';
import {
  balanceWarnings,
  configProblem,
  maxWolves,
  recommendedConfig,
  toggleRole,
  villagerCount,
} from './composition';

describe('composición de El lobo', () => {
  it('la recomendada sigue la tabla del plan, con la vidente a la vista', () => {
    expect(recommendedConfig(4)).toEqual({ wolves: 1, roles: ['seer'] });
    expect(recommendedConfig(6)).toEqual({ wolves: 1, roles: ['seer'] });
    expect(recommendedConfig(8)).toEqual({ wolves: 2, roles: ['seer', 'protector'] });
    expect(recommendedConfig(9)).toEqual({ wolves: 2, roles: ['seer', 'protector', 'hunter'] });
    expect(recommendedConfig(13)).toEqual({
      wolves: 3,
      roles: ['seer', 'protector', 'hunter', 'jester'],
    });
    expect(recommendedConfig(16)).toEqual({
      wolves: 3,
      roles: ['seer', 'protector', 'hunter', 'jester', 'cupid'],
    });
  });

  it('la recomendada es válida y no avisa de nada de 4 a 16 jugadores', () => {
    for (let players = 4; players <= 16; players += 1) {
      expect(configProblem(players, recommendedConfig(players))).toBeNull();
      expect(balanceWarnings(players, recommendedConfig(players))).toEqual([]);
    }
  });

  it('cuenta los aldeanos que quedan, sin vidente de regalo', () => {
    expect(villagerCount(9, { wolves: 2, roles: ['protector', 'hunter'] })).toBe(5);
    expect(villagerCount(9, { wolves: 2, roles: ['seer', 'protector', 'hunter'] })).toBe(4);
  });

  it('solo rechaza lo que no se puede jugar', () => {
    expect(configProblem(8, { wolves: 0, roles: ['seer'] })).toBe('no_threat');
    expect(configProblem(8, { wolves: 0, roles: ['seer', 'killer'] })).toBeNull();
    expect(
      configProblem(8, {
        wolves: 1,
        roles: ['seer', 'protector', 'hunter', 'jester', 'cupid', 'witch', 'killer'],
      }),
    ).toBeNull();
    expect(configProblem(5, { wolves: 5, roles: [] })).toBe('all_wolves');
    expect(
      configProblem(6, { wolves: 2, roles: ['seer', 'protector', 'hunter', 'jester', 'cupid'] }),
    ).toBe('too_many_roles');
  });

  it('acepta composiciones que antes estaban prohibidas', () => {
    expect(configProblem(8, { wolves: 4, roles: [] })).toBeNull();
    expect(configProblem(5, { wolves: 4, roles: [] })).toBeNull();
    expect(configProblem(5, { wolves: 4, roles: ['seer'] })).toBeNull();
    expect(configProblem(6, { wolves: 2, roles: ['seer', 'protector', 'hunter', 'jester'] })).toBe(
      null,
    );
    expect(configProblem(9, { wolves: 2, roles: [] })).toBeNull();
  });

  it('se pueden pedir todos los lobos menos uno', () => {
    expect(maxWolves(5)).toBe(4);
    expect(maxWolves(16)).toBe(15);
    expect(maxWolves(0)).toBe(0);
  });

  it('avisa cuando los lobos ya son mayoría', () => {
    expect(balanceWarnings(5, { wolves: 4, roles: ['seer'] })).toEqual(['wolves_majority']);
    expect(balanceWarnings(8, { wolves: 4, roles: ['seer'] })).toEqual(['wolves_majority']);
  });

  it('avisa cuando hay más lobos que en la recomendada sin llegar a mayoría', () => {
    expect(balanceWarnings(9, { wolves: 3, roles: ['seer'] })).toEqual([
      'wolves_above_recommended',
    ]);
    expect(balanceWarnings(9, { wolves: 2, roles: ['seer'] })).toEqual([]);
  });

  it('avisa si hay lobos y no hay vidente', () => {
    expect(balanceWarnings(9, { wolves: 2, roles: [] })).toEqual(['no_seer']);
    expect(balanceWarnings(5, { wolves: 4, roles: [] })).toEqual(['wolves_majority', 'no_seer']);
    expect(balanceWarnings(9, { wolves: 0, roles: [] })).toEqual([]);
  });

  it('activar un rol lo deja en su orden y desactivarlo lo quita', () => {
    expect(toggleRole({ wolves: 1, roles: ['jester'] }, 'protector').roles).toEqual([
      'protector',
      'jester',
    ]);
    expect(toggleRole({ wolves: 1, roles: ['protector', 'jester'] }, 'seer').roles).toEqual([
      'seer',
      'protector',
      'jester',
    ]);
    expect(toggleRole({ wolves: 1, roles: ['seer', 'jester'] }, 'seer').roles).toEqual(['jester']);
  });
});
