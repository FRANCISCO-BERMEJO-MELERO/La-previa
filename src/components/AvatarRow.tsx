import type { AvatarId } from '@/lib/avatars';
import { Avatar } from './Avatar';

export type AvatarRowItem = {
  userId: string;
  name: string;
  joinIndex: number;
  avatar?: AvatarId | null;
  muted: boolean;
};

type AvatarRowProps = {
  players: AvatarRowItem[];
  /** Texto a la derecha, como "5 conectados". */
  summary: string;
};

/** Fila de avatares de las pantallas de partida; los nombres completos van en `title`. */
export function AvatarRow({ players, summary }: AvatarRowProps) {
  return (
    <div className="flex items-center gap-2">
      <ul className="flex min-w-0 flex-wrap gap-2">
        {players.map((player) => (
          <li key={player.userId} title={player.name}>
            <Avatar
              name={player.name}
              joinIndex={player.joinIndex}
              avatar={player.avatar}
              dashed={player.muted}
            />
            <span className="sr-only">{player.name}</span>
          </li>
        ))}
      </ul>
      <p className="ml-auto shrink-0 text-sm font-bold">{summary}</p>
    </div>
  );
}
