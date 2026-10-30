import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { CandidateList } from '@/games/rounds/CandidateList';
import type { Player } from '@/games/rounds/game-view';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';

type CardText = { word: string; forbidden: string[] };

/** La tarjeta oscura con la palabra y las cinco que no se pueden decir. */
function TabooCard({ label, word, forbidden }: CardText & { label: string }) {
  return (
    <Card variant="dark" tilt="left">
      <Pill tone="tomato" caps>
        {label}
      </Pill>
      <h1 className={`font-display uppercase ${fitDisplay(word, 'text-display-sm')}`}>{word}</h1>
      <h2 className="text-label font-bold uppercase tracking-label">
        {copy.palabrasProhibidas.forbidden}
      </h2>
      <ul className="flex flex-col gap-1">
        {forbidden.map((text) => (
          <li key={text} className="text-xl font-bold uppercase">
            {text}
          </li>
        ))}
      </ul>
    </Card>
  );
}

type DescribeScreenProps = Omit<GameScreenProps, 'footer'> &
  CardText & {
    /** Quienes pueden haber acertado. */
    candidates: Player[];
    selected: string | null;
    busy: boolean;
    error?: string;
    onSelect: (userId: string) => void;
    onGuessed: () => void;
    onPass: () => void;
  };

/** Quien describe: su tarjeta, a quién marcar cuando acierte y la opción de pasar. */
export function DescribeScreen({
  word,
  forbidden,
  candidates,
  selected,
  busy,
  error,
  onSelect,
  onGuessed,
  onPass,
  ...chrome
}: DescribeScreenProps) {
  const target = candidates.find((candidate) => candidate.userId === selected);
  return (
    <GameScreen
      {...chrome}
      footer={
        <>
          {error ? (
            <p role="alert" className="animate-caer text-md font-bold">
              {error}
            </p>
          ) : null}
          <Button fullWidth disabled={busy || !target} onClick={onGuessed}>
            {target
              ? copy.palabrasProhibidas.guessed(target.name)
              : copy.palabrasProhibidas.chooseGuesser}
          </Button>
          <Button variant="secondary" fullWidth disabled={busy} onClick={onPass}>
            {copy.palabrasProhibidas.pass}
          </Button>
        </>
      }
    >
      <TabooCard label={copy.palabrasProhibidas.describePill} word={word} forbidden={forbidden} />
      <p className="text-md font-medium">{copy.palabrasProhibidas.describeHint}</p>
      <h2 className="font-display text-lg uppercase">{copy.palabrasProhibidas.whoGuessed}</h2>
      <CandidateList
        candidates={candidates}
        selected={selected}
        onSelect={onSelect}
        pressedLabel={copy.palabrasProhibidas.picked}
      />
    </GameScreen>
  );
}

type WatchScreenProps = Omit<GameScreenProps, 'footer'> &
  CardText & {
    describer: string;
    busy: boolean;
    error?: string;
    onForbidden: () => void;
  };

/** Quien vigila: la tarjeta y el botón para cantar la prohibida. */
export function WatchScreen({
  word,
  forbidden,
  describer,
  busy,
  error,
  onForbidden,
  ...chrome
}: WatchScreenProps) {
  return (
    <GameScreen
      {...chrome}
      footer={
        <>
          {error ? (
            <p role="alert" className="animate-caer text-md font-bold">
              {error}
            </p>
          ) : null}
          <Button fullWidth disabled={busy} onClick={onForbidden}>
            {copy.palabrasProhibidas.forbiddenButton}
          </Button>
        </>
      }
    >
      <TabooCard label={copy.palabrasProhibidas.watchPill} word={word} forbidden={forbidden} />
      <p className="text-md font-medium">{copy.palabrasProhibidas.watchHint(describer)}</p>
    </GameScreen>
  );
}

type GuessScreenProps = GameScreenProps & {
  describer: string;
  watcher: string;
};

/** Quien adivina no ve la tarjeta: solo quién describe y quién vigila. */
export function GuessScreen({ describer, watcher, ...chrome }: GuessScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="right">
        <Pill tone="tomato" caps>
          {copy.palabrasProhibidas.guessPill}
        </Pill>
        <h1 className="font-display text-display-2xs uppercase">
          {copy.palabrasProhibidas.guessTitle}
        </h1>
        <p className="text-md font-medium">{copy.palabrasProhibidas.guessText(describer)}</p>
      </Card>
      {watcher ? (
        <p className="text-md font-bold">{copy.palabrasProhibidas.watcherIs(watcher)}</p>
      ) : null}
    </GameScreen>
  );
}

type RevealScreenProps = GameScreenProps &
  CardText & {
    /** Cómo ha acabado la ronda, con nombres. */
    outcome:
      | { type: 'guessed'; guesser: string; describer: string }
      | { type: 'forbidden' }
      | { type: 'passed'; describer: string };
  };

/** La tarjeta entera y cómo ha acabado la ronda. */
export function RevealScreen({ word, forbidden, outcome, ...chrome }: RevealScreenProps) {
  const pill =
    outcome.type === 'guessed'
      ? copy.palabrasProhibidas.guessedPill(outcome.guesser)
      : outcome.type === 'forbidden'
        ? copy.palabrasProhibidas.forbiddenPill
        : copy.palabrasProhibidas.passedPill(outcome.describer);
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="right" tone={outcome.type === 'guessed' ? 'lime' : 'paper'}>
        <Pill tone="tomato" caps>
          {pill}
        </Pill>
        <h1 className={`font-display uppercase ${fitDisplay(word, 'text-display-sm')}`}>{word}</h1>
        <p className="text-md font-bold">
          {outcome.type === 'guessed'
            ? copy.palabrasProhibidas.guessedPoints(outcome.guesser, outcome.describer)
            : copy.palabrasProhibidas.noPoints}
        </p>
      </Card>
      <Card>
        <h2 className="text-label font-bold uppercase tracking-label">
          {copy.palabrasProhibidas.forbidden}
        </h2>
        <ul className="flex flex-col gap-1">
          {forbidden.map((text) => (
            <li key={text} className="text-lg font-bold uppercase">
              {text}
            </li>
          ))}
        </ul>
      </Card>
    </GameScreen>
  );
}
