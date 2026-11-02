import { Card } from '@/components/Card';
import { Count } from '@/components/Count';
import { PlayerChip } from '@/components/PlayerChip';
import { copy } from '@/lib/copy';
import { AFTER_ENTRY_MS, delayClass, motionMs, sequenceDelays } from '@/lib/motion';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { RevealData, RevealLie } from './game-view';

type RevealScreenProps = GameScreenProps & {
  question: string;
  explanation: string | null;
  reveal: RevealData;
  /** Recién llegada a la revelación: el sello se planta, las mentiras caen y los puntos cuentan. */
  animate?: boolean;
};

/** La verdad con su explicación, cada mentira con quién la coló y quién se la tragó, y los puntos. */
export function RevealScreen({
  question,
  explanation,
  reveal,
  animate = false,
  ...chrome
}: RevealScreenProps) {
  const { truth, lies, points } = reveal;
  const stampAt = AFTER_ENTRY_MS;
  const delays = sequenceDelays(lies.length, motionMs.base, stampAt + motionMs.lento);
  const fall = (index: number) => (animate ? `animate-caer ${delayClass(delays[index] ?? 0)}` : '');
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <p className="text-md font-bold wrap-break-word">{question}</p>
        <p
          className={`tilt-pill-right self-start rounded-control border-3 border-ink bg-lime px-4 py-2 font-display text-xl uppercase ${animate ? `animate-sello ${delayClass(stampAt)}` : ''}`}
        >
          {copy.cuela.truth}
        </p>
        <h1 className="font-display text-2xl wrap-break-word">{truth?.text ?? ''}</h1>
        {explanation ? <p className="text-md font-medium">{explanation}</p> : null}
        <p className="text-base font-bold">
          {truth && truth.voters.length > 0
            ? copy.cuela.guessed(truth.voters.map((player) => player.name))
            : copy.cuela.nobodyGuessed}
        </p>
      </Card>
      {lies.length > 0 ? (
        <>
          <h2 className="font-display text-lg uppercase">{copy.cuela.lies}</h2>
          <ul className="flex flex-col gap-3">
            {lies.map((lie, index) => (
              <li key={lie.id} className={fall(index)}>
                <LieCard lie={lie} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {points.length > 0 ? (
        <>
          <h2 className="font-display text-lg uppercase">{copy.cuela.points}</h2>
          <ul className="grid grid-cols-2 gap-3">
            {points.map(({ player, points: earned }) => (
              <li
                key={player.userId}
                className="flex min-w-0 items-center justify-between gap-2 rounded-chip border-3 border-ink bg-paper px-3 py-2"
              >
                <span className="min-w-0 truncate text-base font-bold">{player.name}</span>
                <span className="shrink-0 font-display text-lg">
                  <Count
                    value={earned}
                    from={animate ? 0 : null}
                    delay={stampAt}
                    format={copy.cuela.plus}
                  />
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </GameScreen>
  );
}

function LieCard({ lie }: { lie: RevealLie }) {
  const authors = lie.authors.map((player) =>
    lie.leftIds.includes(player.userId) ? copy.cuela.left(player.name) : player.name,
  );
  return (
    <Card>
      <p className="font-display text-xl wrap-break-word">{copy.cuela.quoted(lie.text)}</p>
      <p className="text-base font-bold">
        {authors.length > 0 ? copy.cuela.sneaked(authors) : copy.cuela.house}
      </p>
      {lie.voters.length > 0 ? (
        <>
          <p className="text-label font-bold uppercase tracking-label">{copy.cuela.swallowed}</p>
          <ul className="grid grid-cols-2 gap-2">
            {lie.voters.map((player) => (
              <li key={player.userId} className="min-w-0">
                <PlayerChip
                  name={player.name}
                  joinIndex={player.joinIndex}
                  avatar={player.avatar}
                />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-md font-medium">{copy.cuela.nobodySwallowed}</p>
      )}
    </Card>
  );
}
