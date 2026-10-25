import { optionalRoles, type OptionalRole } from './roles';

/** Cuántos lobos y qué roles especiales hay en una partida (docs/PLAN-6.md §1). */
export type LunaConfig = { wolves: number; roles: readonly OptionalRole[] };

export const MIN_LUNA_PLAYERS = 4;

/** Reparto recomendado; el mismo que calcula la base de datos. */
export function recommendedConfig(players: number): LunaConfig {
  if (players <= 6) return { wolves: 1, roles: ['seer'] };
  if (players <= 8) return { wolves: 2, roles: ['seer', 'protector'] };
  if (players <= 11) return { wolves: 2, roles: ['seer', 'protector', 'hunter'] };
  if (players <= 13) return { wolves: 3, roles: ['seer', 'protector', 'hunter', 'jester'] };
  return { wolves: 3, roles: ['seer', 'protector', 'hunter', 'jester', 'cupid'] };
}

/** Aldeanos que quedan: los huecos que no son lobos ni roles especiales. */
export function villagerCount(players: number, config: LunaConfig): number {
  return players - config.wolves - config.roles.length;
}

export type ConfigProblem = 'no_threat' | 'all_wolves' | 'too_many_roles';

/** Por qué no se puede jugar esta composición, si no se puede. El equilibrio no cuenta. */
export function configProblem(players: number, config: LunaConfig): ConfigProblem | null {
  if (config.wolves === 0) return 'no_threat';
  if (config.wolves >= players) return 'all_wolves';
  if (villagerCount(players, config) < 0) return 'too_many_roles';
  return null;
}

/** Más lobos que se pueden pedir: todos menos uno. */
export function maxWolves(players: number): number {
  return Math.max(0, players - 1);
}

export type BalanceWarning = 'wolves_majority' | 'wolves_above_recommended' | 'no_seer';

/** Consejos sobre el equilibrio de la partida. Avisan, pero no impiden empezar. */
export function balanceWarnings(players: number, config: LunaConfig): BalanceWarning[] {
  const warnings: BalanceWarning[] = [];
  if (config.wolves > 0 && 2 * config.wolves >= players) warnings.push('wolves_majority');
  else if (config.wolves > recommendedConfig(players).wolves) {
    warnings.push('wolves_above_recommended');
  }
  if (config.wolves > 0 && !config.roles.includes('seer')) warnings.push('no_seer');
  return warnings;
}

/** Activa o desactiva un rol especial y lo deja en su orden. */
export function toggleRole(config: LunaConfig, role: OptionalRole): LunaConfig {
  const active = config.roles.includes(role);
  return {
    ...config,
    roles: optionalRoles.filter((item) => (item === role ? !active : config.roles.includes(item))),
  };
}
