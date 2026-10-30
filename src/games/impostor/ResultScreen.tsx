import { Fragment, type ReactNode } from 'react';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { AFTER_ENTRY_MS, delayClass, motionMs, sequenceDelays } from '@/lib/motion';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';

type ResultScreenProps = GameScreenProps & {
  /** Has ganado, has perdido o no jugabas (llegaste tarde). */
  outcome: 'won' | 'lost' | 'spectator';
  winner: 'group' | 'impostors';
  impostorNames: string[];
  word: string;
  /** Al llegar: sello del titular y, después, los impostores de uno en uno. */
  animate?: boolean;
};

/** 13 y 14: resultado, y su variante neutra para quien llegó tarde. */
export function ResultScreen({
  outcome,
  winner,
  impostorNames,
  word,
  animate = false,
  ...chrome
}: ResultScreenProps) {
  const dark = outcome === 'lost';
  const delays = sequenceDelays(
    impostorNames.length,
    motionMs.base,
    AFTER_ENTRY_MS + motionMs.lento,
  );
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
        <span
          className={`inline-block ${animate ? `animate-sello ${delayClass(AFTER_ENTRY_MS)}` : ''}`}
        >
          {title}
        </span>
      </h1>
      <dl
        className={`flex flex-col gap-2.5 border-t-3 pt-3.5 ${dark ? 'border-paper' : 'border-ink'}`}
      >
        <ResultRow
          label={copy.result.impostorsLabel(impostorNames.length)}
          value={impostorNames.map((name, index) => (
            <Fragment key={index}>
              {copy.result.nameJoin(index, impostorNames.length)}
              <span
                className={`tilt-pill-left inline-block rounded-control border-3 border-ink bg-tomato px-2 text-ink ${animate ? `animate-caer ${delayClass(delays[index] ?? 0)}` : ''}`}
              >
                {name}
              </span>
            </Fragment>
          ))}
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

function ResultRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm font-bold">{label}</dt>
      <dd className="text-right font-display text-lg uppercase">{value}</dd>
    </div>
  );
}
