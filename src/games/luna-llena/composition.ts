import { optionalRoles, type OptionalRole } from './roles';

/** Cuántos lobos y qué roles opcionales hay en una partida (docs/PLAN-5.md §2). */
export type LunaConfig = { wolves: number; roles: readonly OptionalRole[] };

export const MIN_LUNA_PLAYERS = 4;

/** Reparto recomendado; el mismo que calcula la base de datos. */
export function recommendedConfig(players: number): LunaConfig {
  if (players <= 6) return { wolves: 1, roles: [] };
  if (players <= 8) return { wolves: 2, roles: ['protector'] };
  if (players <= 11) return { wolves: 2, roles: ['protector', 'hunter'] };
  if (players <= 13) return { wolves: 3, roles: ['protector', 'hunter', 'jester'] };
  return { wolves: 3, roles: optionalRoles };
}

/** Aldeanos que quedan: todos menos los lobos, la vidente y los opcionales. */
export function villagerCount(players: number, config: LunaConfig): number {
  return players - config.wolves - 1 - config.roles.length;
}

export type ConfigProblem = 'too_many_wolves' | 'no_villager';

/** Por qué no se puede empezar con esta composición, si no se puede. */
export function configProblem(players: number, config: LunaConfig): ConfigProblem | null {
  if (2 * config.wolves >= players) return 'too_many_wolves';
  if (villagerCount(players, config) < 1) return 'no_villager';
  return null;
}

/** Más lobos que se pueden pedir: siempre menos de la mitad, y al menos uno. */
export function maxWolves(players: number): number {
  return Math.max(1, Math.ceil(players / 2) - 1);
}

/** Activa o desactiva un rol opcional y lo deja en su orden. */
export function toggleRole(config: LunaConfig, role: OptionalRole): LunaConfig {
  const active = config.roles.includes(role);
  return {
    ...config,
    roles: optionalRoles.filter((item) => (item === role ? !active : config.roles.includes(item))),
  };
}
