import { AvatarRow, type AvatarRowItem } from '@/components/AvatarRow';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import { GameScreen, type GameScreenProps } from './GameScreen';

type LateScreenProps = GameScreenProps & {
  myName: string;
  playing: AvatarRowItem[];
};

/** 05: hay partida y no participas; juegas en la siguiente. */
export function LateScreen({ myName, playing, ...chrome }: LateScreenProps) {
  const title = copy.late.title(myName);
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="right" grow>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <Pill tone="orange" caps>
            {copy.late.pill}
          </Pill>
          <h1 className={`font-display uppercase ${fitDisplay(title, 'text-display-md')}`}>
            {title}
          </h1>
          <p className="text-lead font-medium">{copy.late.text}</p>
        </div>
      </Card>
      <AvatarRow players={playing} summary={copy.late.playing(playing.length)} />
    </GameScreen>
  );
}
