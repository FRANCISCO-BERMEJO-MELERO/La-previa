import { copy } from '@/lib/copy';
import { delayClass, motionMs, sequenceDelays } from '@/lib/motion';
import { RoleArt } from './RoleArt';
import type { RoleRow } from './game-view';
import { roleBackground } from './roles';

/** Todos los jugadores con su rol y si siguen vivos. Al terminar la partida, caen de uno en uno. */
export function RolesList({
  rows,
  start = null,
}: {
  rows: readonly RoleRow[];
  /** Cuándo empieza a caer la primera fila; sin él, quietas. */
  start?: number | null;
}) {
  const delays = sequenceDelays(rows.length, motionMs.base);
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <li
          key={row.userId}
          className={`flex items-center gap-3 rounded-chip border-3 border-ink p-2 ${row.alive ? 'bg-paper' : 'border-dashed bg-ground-soft'} ${start === null ? '' : `animate-caer ${delayClass(start + (delays[index] ?? 0))}`}`}
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
