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
  hint?: string | null;
  players: AvatarRowItem[];
  connected: number;
};

/** 06 y 07: el reparto. El jugador normal ve la palabra; el impostor, solo su pista. */
export function DealScreen({
  role,
  word,
  category,
  hint = null,
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
          <InfoRow label={copy.deal.impostorClue} value={hint ?? category} onDark />
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
          <InfoRow label={copy.deal.category} value={category} />
        </Card>
      )}
      <p className="text-base font-medium">
        {impostor ? copy.deal.impostorHint : copy.deal.playerHint}
      </p>
      <AvatarRow players={players} summary={copy.deal.connected(connected)} />
    </GameScreen>
  );
}

function InfoRow({
  label,
  value,
  onDark = false,
}: {
  label: string;
  value: string;
  onDark?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 border-t-3 pt-3.5 ${onDark ? 'border-paper' : 'border-ink'}`}
    >
      <p className="text-sm font-bold">{label}</p>
      <p className="text-right font-display text-lg uppercase">{value}</p>
    </div>
  );
}
