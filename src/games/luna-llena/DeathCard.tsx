import { copy } from '@/lib/copy';
import type { LunaCause, LunaLlenaGameState } from '@/lib/snapshot';
import { RoleArt } from './RoleArt';
import { roleBackground } from './roles';

type AnnouncedDeath = NonNullable<LunaLlenaGameState['announcement']>['deaths'][number];

/** Una muerte anunciada. Los vivos la reciben con la causa pública; los muertos, con la real. */
export type Death = Omit<AnnouncedDeath, 'cause'> & { cause: LunaCause };

/** Un muerto, con el dibujo de su rol, su nombre, su rol y por qué ha muerto. */
export function DeathCard({ death }: { death: Death }) {
  return (
    <div className="flex items-center gap-3 rounded-chip border-3 border-ink bg-paper p-3">
      <span
        className={`w-20 shrink-0 overflow-hidden rounded-control border-3 border-ink ${roleBackground[death.role]}`}
      >
        <RoleArt role={death.role} decorative />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-display text-title uppercase">{death.name}</span>
        <span className="text-md font-bold">{copy.lunaLlena.roles[death.role].name}</span>
        <span className="text-sm font-medium">{copy.lunaLlena.dawn.causes[death.cause]}</span>
      </span>
    </div>
  );
}
