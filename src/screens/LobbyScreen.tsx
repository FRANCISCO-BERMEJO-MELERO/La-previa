import { Pill } from '@/components/Pill';
import { PlayerChip } from '@/components/PlayerChip';
import { Screen } from '@/components/Screen';
import { copy } from '@/lib/copy';
import type { Snapshot } from '@/lib/snapshot';

export const MAX_PLAYERS = 16;

type LobbyScreenProps = {
  snapshot: Snapshot;
};

export function LobbyScreen({ snapshot }: LobbyScreenProps) {
  const { players, room } = snapshot;
  return (
    <Screen
      brand={copy.brand}
      aside={
        <Pill tone="tomato" tilted>
          {copy.games.impostor.name}
        </Pill>
      }
    >
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-lg uppercase">{copy.lobby.players}</h1>
        <p className="text-sm font-bold">{copy.lobby.count(players.length, MAX_PLAYERS)}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {players.map((player, index) => (
          <li key={player.user_id} className="min-w-0">
            <PlayerChip
              name={player.name}
              joinIndex={index}
              muted={!player.connected}
              detail={
                player.user_id === room.host_id
                  ? copy.lobby.host
                  : player.connected
                    ? undefined
                    : copy.lobby.disconnected
              }
            />
          </li>
        ))}
      </ul>
    </Screen>
  );
}
