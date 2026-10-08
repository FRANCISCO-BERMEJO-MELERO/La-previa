import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from './GameScreen';

type ResultScreenProps = GameScreenProps & {
  /** Has ganado, has perdido o no jugabas (llegaste tarde). */
  outcome: 'won' | 'lost' | 'spectator';
  winner: 'group' | 'impostors';
  impostorNames: string[];
  word: string;
};

/** 13 y 14: resultado, y su variante neutra para quien llegó tarde. */
export function ResultScreen({
  outcome,
  winner,
  impostorNames,
  word,
  ...chrome
}: ResultScreenProps) {
  const dark = outcome === 'lost';
  const pill = copy.result.winnerPill(winner, impostorNames.length);
  const title =
    outcome === 'won'
      ? copy.result.won
      : outcome === 'lost'
        ? copy.result.lost
        : copy.result.finished;

  const body = (
    <>
      <Pill tone={dark ? 'tomato' : 'paper'} caps onDark={dark}>
        {pill}
      </Pill>
      <h1
        className={`flex flex-1 items-center font-display text-display-md uppercase ${dark ? 'text-ground' : ''}`}
      >
        {title}
      </h1>
      <dl
        className={`flex flex-col gap-2.5 border-t-3 pt-3.5 ${dark ? 'border-paper' : 'border-ink'}`}
      >
        <ResultRow
          label={copy.result.impostorsLabel(impostorNames.length)}
          value={copy.result.names(impostorNames)}
        />
        <ResultRow label={copy.result.wordWas} value={word} />
      </dl>
    </>
  );

  return (
    <GameScreen {...chrome}>
      {dark ? (
        <Card variant="dark" tilt="right" grow>
          {body}
        </Card>
      ) : (
        <Card variant="hero" tilt="left" tone={outcome === 'won' ? 'lime' : 'paper'} grow>
          {body}
        </Card>
      )}
      {winner === 'impostors' ? (
        <p className="text-base font-medium">{copy.result.impostorsEqual}</p>
      ) : null}
    </GameScreen>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm font-bold">{label}</dt>
      <dd className="text-right font-display text-lg uppercase">{value}</dd>
    </div>
  );
}
