import { Avatar } from '@/components/Avatar';
import { copy } from '@/lib/copy';
import type { LunaPlayer } from './game-view';

type PlayerListProps = {
  /** Nombre del grupo para los lectores de pantalla. */
  label: string;
  players: readonly LunaPlayer[];
  selected: readonly string[];
  onToggle: (userId: string) => void;
  /** Una línea bajo el nombre de algunos jugadores, como las marcas de la manada. */
  notes?: ReadonlyMap<string, string>;
  /** Sobre la tarjeta oscura de la noche. */
  onDark?: boolean;
  /** El alcalde lleva su distintivo. */
  mayorId?: string | null;
};

/** Jugadores para elegir; los elegidos quedan marcados hasta que se confirma. */
export function PlayerList({
  label,
  players,
  selected,
  onToggle,
  notes,
  onDark = false,
  mayorId = null,
}: PlayerListProps) {
  return (
    <ul aria-label={label} className="flex flex-col gap-2.5">
      {players.map((player) => {
        const pressed = selected.includes(player.userId);
        const note = notes?.get(player.userId);
        const look = pressed
          ? 'bg-ground text-ink shadow-hard-tomato'
          : onDark
            ? 'border-paper bg-ink text-paper'
            : 'bg-paper text-ink';
        return (
          <li key={player.userId}>
            <button
              type="button"
              aria-pressed={pressed}
              onClick={() => {
                onToggle(player.userId);
              }}
              className={`flex min-h-14 w-full items-center gap-3 rounded-chip border-3 px-3 py-2 text-left ${pressed ? 'border-ink' : ''} ${look}`}
            >
              <Avatar
                name={player.name}
                joinIndex={player.joinIndex}
                avatar={player.avatar}
                muted={!player.connected}
                onDark={onDark && !pressed}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-lg font-bold">{player.name}</span>
                  {player.userId === mayorId ? <MayorBadge /> : null}
                </span>
                {note ? <span className="text-sm font-medium">{note}</span> : null}
              </span>
              {pressed ? (
                <span className="rounded-full border-2 border-ink bg-paper px-2.5 py-1 text-label font-bold text-ink">
                  {copy.lunaLlena.night.mine}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Distintivo del alcalde junto a su nombre. */
export function MayorBadge() {
  return (
    <span className="shrink-0 rounded-full border-2 border-ink bg-lime px-2 py-0.5 text-label font-bold text-ink">
      {copy.lunaLlena.mayorBadge}
    </span>
  );
}
