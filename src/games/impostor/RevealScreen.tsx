import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import type { AvatarId } from '@/lib/avatars';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';

type RevealScreenProps = GameScreenProps & {
  /** Expulsado por votación o se ha ido de la sala. */
  kind: 'eliminated' | 'left';
  name: string;
  joinIndex: number;
  avatar?: AvatarId | null;
  wasImpostor: boolean;
  /** Texto bajo la tarjeta: cómo sigue la partida o que se ha acabado. */
  summary: string;
};

/** 10: revelación de una expulsión o de un abandono. */
export function RevealScreen({
  kind,
  name,
  joinIndex,
  avatar = null,
  wasImpostor,
  summary,
  ...chrome
}: RevealScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left" grow>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <p className="text-label font-bold uppercase tracking-label">
            {kind === 'left' ? copy.reveal.left : copy.reveal.expelled}
          </p>
          <Avatar name={name} joinIndex={joinIndex} avatar={avatar} size="lg" />
          <h1 className={`font-display uppercase ${fitDisplay(name, 'text-display-md')}`}>
            {name}
          </h1>
          <p
            className={`tilt-pill-right rounded-control border-3 border-ink px-4 py-2 font-display text-xl uppercase ${wasImpostor ? 'bg-tomato' : 'bg-sky'}`}
          >
            {wasImpostor ? copy.reveal.wasImpostor : copy.reveal.wasNotImpostor}
          </p>
        </div>
      </Card>
      <p className="text-base font-medium">{summary}</p>
    </GameScreen>
  );
}
