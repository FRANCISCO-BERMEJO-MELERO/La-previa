import { copy } from '@/lib/copy';
import type { LunaNarration } from '@/lib/snapshot';
import type { LunaRole } from './roles';

const { script, spokenRoles } = copy.lunaLlena;

function spoken(role: LunaRole | undefined): string {
  return role ? spokenRoles[role] : '';
}

/** Lo que lee el narrador en voz alta: la frase de la clave y, si las hay, las que la siguen. */
export function narrationLines({ key, params }: LunaNarration): string[] {
  const name = params.name ?? '';
  const role = spoken(params.role);
  const lover = params.lover
    ? [script.loverDeath(params.lover.name, spoken(params.lover.role))]
    : [];

  switch (key) {
    case 'roles':
      return [script.roles];
    case 'night_first':
      return [script.nightFirst];
    case 'night':
      return [script.night];
    case 'dawn_death':
      return [script.dawnDeath(name, role)];
    case 'dawn_deaths':
      return [script.dawnDeaths(params.names ?? []), ...lover];
    case 'dawn_none':
      return [script.dawnNone];
    case 'hunter':
      return [script.hunter(name)];
    case 'hunter_shot':
      return [script.hunterShot(name, role), ...lover];
    case 'left':
      return [script.left(name, role), ...lover];
    case 'mayor':
      return [script.mayor];
    case 'day':
      return params.mayor ? [script.mayorElected(params.mayor), script.day] : [script.day];
    case 'voting':
      return [script.voting];
    case 'defense':
      return [script.defense(name)];
    case 'no_accused':
      return [script.noAccused];
    case 'executed':
      return [script.executed(name, role), ...lover];
    case 'win_village':
      return [script.winVillage];
    case 'win_wolves':
      return [script.winWolves];
    case 'win_jester':
      return [script.winJester];
    case 'win_killer':
      return [script.winKiller];
  }
}
