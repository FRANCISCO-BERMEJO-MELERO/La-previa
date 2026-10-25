/** Roles de El lobo (docs/PLAN-5.md §2 y docs/PLAN-6.md §2 y §3). */
export const lunaRoles = [
  'wolf',
  'villager',
  'seer',
  'protector',
  'hunter',
  'jester',
  'cupid',
  'witch',
  'killer',
] as const;

export type LunaRole = (typeof lunaRoles)[number];

/** Los que el anfitrión activa o no, en el orden en que se enumeran siempre. */
export const optionalRoles = [
  'seer',
  'protector',
  'hunter',
  'jester',
  'cupid',
  'witch',
  'killer',
] as const;

export type OptionalRole = (typeof optionalRoles)[number];

export type Team = 'village' | 'wolves' | 'solo';

export function teamOf(role: LunaRole): Team {
  if (role === 'wolf') return 'wolves';
  if (role === 'jester' || role === 'killer') return 'solo';
  return 'village';
}

/** Fondo del bloque de ilustración de cada rol. */
export const roleBackground: Record<LunaRole, string> = {
  wolf: 'bg-tomato',
  villager: 'bg-orange',
  seer: 'bg-lilac',
  protector: 'bg-sky',
  hunter: 'bg-lime',
  jester: 'bg-ground-soft',
  cupid: 'bg-field-error',
  witch: 'bg-field',
  killer: 'bg-ground',
};
