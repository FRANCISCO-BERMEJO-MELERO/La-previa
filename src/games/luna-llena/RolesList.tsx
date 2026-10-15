import { copy } from '@/lib/copy';
import { RoleArt } from './RoleArt';
import type { RoleRow } from './game-view';
import { roleBackground } from './roles';

/** Todos los jugadores con su rol y si siguen vivos. */
export function RolesList({ rows }: { rows: readonly RoleRow[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.userId}
          className={`flex items-center gap-3 rounded-chip border-3 border-ink p-2 ${row.alive ? 'bg-paper' : 'border-dashed bg-ground-soft'}`}
        >
          <span
            className={`w-14 shrink-0 overflow-hidden rounded-control border-2 border-ink ${roleBackground[row.role]}`}
          >
            <RoleArt role={row.role} decorative />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base font-bold">{row.name}</span>
            <span className="text-sm font-medium">
              {copy.lunaLlena.roles[row.role].name}
              {row.alive ? '' : ` · ${copy.lunaLlena.spectator.dead}`}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
