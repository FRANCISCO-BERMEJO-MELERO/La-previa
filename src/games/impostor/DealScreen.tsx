import { AvatarRow, type AvatarRowItem } from '@/components/AvatarRow';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';

type DealScreenProps = GameScreenProps & {
  role: 'player' | 'impostor';
  word: string | null;
  category: string;
  players: AvatarRowItem[];
  connected: number;
};

/** 06 y 07: el reparto. El jugador normal ve la palabra; el impostor, solo la categoría. */
export function DealScreen({
  role,
  word,
  category,
  players,
  connected,
  ...chrome
}: DealScreenProps) {
  const impostor = role === 'impostor';
  return (
    <GameScreen {...chrome}>
      {impostor ? (
        <Card variant="dark" tilt="right" grow>
          <Pill tone="tomato" caps onDark>
            {copy.deal.impostorPill}
          </Pill>
          <h1 className="flex flex-1 items-center font-display text-display-md text-ground uppercase">
            {copy.deal.impostorTitle}
          </h1>
          <CategoryRow label={copy.deal.impostorClue} category={category} onDark />
        </Card>
      ) : (
        <Card variant="hero" tilt="left" grow>
          <Pill tone="sky" caps>
            {copy.deal.wordPill}
          </Pill>
          <h1
            className={`flex flex-1 items-center font-display uppercase ${fitDisplay(word ?? '')}`}
          >
            {word}
          </h1>
          <CategoryRow label={copy.deal.category} category={category} />
        </Card>
      )}
      <p className="text-base font-medium">
        {impostor ? copy.deal.impostorHint : copy.deal.playerHint}
      </p>
      <AvatarRow players={players} summary={copy.deal.connected(connected)} />
    </GameScreen>
  );
}

function CategoryRow({
  label,
  category,
  onDark = false,
}: {
  label: string;
  category: string;
  onDark?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-t-3 pt-3.5 ${onDark ? 'border-paper' : 'border-ink'}`}
    >
      <p className="text-sm font-bold">{label}</p>
      <p className="text-right font-display text-lg uppercase">{category}</p>
    </div>
  );
}
