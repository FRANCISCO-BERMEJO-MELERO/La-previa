import { PlayerChip } from '@/components/PlayerChip';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import type { ParticipantView } from './game-view';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';

type OutScreenProps = GameScreenProps & {
  myName: string;
  stillPlaying: ParticipantView[];
};

/** 12: eliminado. Sigues viendo la partida, pero ya no votas. */
export function OutScreen({ myName, stillPlaying, ...chrome }: OutScreenProps) {
  const title = copy.out.title(myName);
  return (
    <GameScreen {...chrome}>
      <div className="flex flex-col gap-3 rounded-hero border-3 border-dashed border-ink bg-paper p-6 hyphens-auto wrap-break-word">
        <h1 className={`font-display uppercase ${fitDisplay(title, 'text-display-md')}`}>
          {title}
        </h1>
        <p className="text-lead font-medium">{copy.out.text}</p>
      </div>
      <h2 className="font-display text-lg uppercase">{copy.out.stillPlaying}</h2>
      <ul className="grid grid-cols-2 gap-3">
        {stillPlaying.map((player) => (
          <li key={player.userId} className="min-w-0">
            <PlayerChip
              name={player.name}
              joinIndex={player.joinIndex}
              avatar={player.avatar}
              muted={!player.connected}
              detail={player.connected ? undefined : copy.lobby.disconnected}
            />
          </li>
        ))}
      </ul>
    </GameScreen>
  );
}
