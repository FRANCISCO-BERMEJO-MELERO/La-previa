import type { ReactNode, SubmitEvent } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { TextField } from '@/components/TextField';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import type { UnaPistaGameState } from '@/lib/snapshot';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { clueSize } from './clue-size';
import { ClueList } from './ClueList';
import type { ClueRow } from './game-view';
import { WordCard } from './WordCard';

export const CLUE_MAX_LENGTH = 20;

/** Al adivino le toca esperar sin mirar mientras los demás escriben y revisan. */
export function GuesserScreen({ reviewing, ...chrome }: GameScreenProps & { reviewing: boolean }) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="right" tone="lime" grow>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="font-display text-display-sm uppercase">{copy.unaPista.guesserTitle}</h1>
          <p className="text-lead font-medium">{copy.unaPista.guesserText}</p>
        </div>
      </Card>
      {reviewing ? <p className="text-base font-bold">{copy.unaPista.guesserReview}</p> : null}
    </GameScreen>
  );
}

type ClueScreenProps = Omit<GameScreenProps, 'footer'> & {
  word: string;
  category: string;
  value: string;
  busy: boolean;
  error?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

/** Palabra y campo de pista. La pista no se cambia una vez enviada. */
export function ClueScreen({
  word,
  category,
  value,
  busy,
  error,
  onChange,
  onSubmit,
  ...chrome
}: ClueScreenProps) {
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <GameScreen
      {...chrome}
      footer={
        <Button type="submit" form="clue-form" fullWidth disabled={busy || value.trim() === ''}>
          {copy.unaPista.send}
        </Button>
      }
    >
      <WordCard word={word} category={category} />
      <form id="clue-form" onSubmit={submit} className="flex flex-col gap-3">
        <TextField
          id="clue"
          label={copy.unaPista.clueLabel}
          value={value}
          maxLength={CLUE_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="none"
          enterKeyHint="send"
          error={error}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
        <p className="text-md font-medium">{copy.unaPista.clueHint}</p>
      </form>
    </GameScreen>
  );
}

/** Revisión: quien ha dado pista puede anular o recuperar cualquiera. */
export function ReviewScreen({
  clues,
  onToggle,
  busy,
  ...chrome
}: GameScreenProps & {
  clues: ClueRow[];
  /** Solo para quien ha dado pista. */
  onToggle?: (userId: string) => void;
  busy: boolean;
}) {
  return (
    <GameScreen {...chrome}>
      <h1 className="font-display text-display-xs uppercase">{copy.unaPista.reviewTitle}</h1>
      <p className="text-md font-medium">{copy.unaPista.reviewHint}</p>
      <ClueList clues={clues} onToggle={onToggle} busy={busy} />
    </GameScreen>
  );
}

/** El adivino ve las pistas que han sobrevivido y dice su respuesta en voz alta. */
export function GuessScreen({ clues, ...chrome }: GameScreenProps & { clues: ClueRow[] }) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <h1 className="flex">
          <Pill tone="lime">{copy.unaPista.guessTitle}</Pill>
        </h1>
        {clues.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {clues.map((clue) => (
              <li
                key={clue.text}
                className={`font-display break-all ${clueSize(clue.text, 'text-display-sm')}`}
              >
                {clue.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-lead font-medium">{copy.unaPista.noClues}</p>
        )}
      </Card>
      <p className="text-base font-bold">{copy.unaPista.guessHint}</p>
    </GameScreen>
  );
}

/** Mientras el adivino piensa: la palabra y las pistas, y el árbitro marca. */
export function GuessWaitScreen({
  word,
  category,
  clues,
  ...chrome
}: GameScreenProps & { word: string; category: string; clues: ClueRow[] }) {
  return (
    <GameScreen {...chrome}>
      <WordCard word={word} category={category} />
      <ClueList clues={clues} />
    </GameScreen>
  );
}

/** Revelación: la palabra, cómo ha ido y todas las pistas con su autor. */
export function RevealScreen({
  word,
  result,
  clues,
  ...chrome
}: GameScreenProps & {
  word: string;
  result: NonNullable<UnaPistaGameState['result']>;
  clues: ClueRow[];
}) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="right" tone={result === 'correct' ? 'lime' : 'paper'}>
        <Pill tone="lime">{copy.unaPista.outcome[result]}</Pill>
        <p className="text-label font-bold uppercase tracking-label">{copy.unaPista.wordWas}</p>
        <h1 className={`font-display uppercase ${fitDisplay(word, 'text-display-md')}`}>{word}</h1>
      </Card>
      {clues.length > 0 ? (
        <>
          <h2 className="font-display text-lg uppercase">{copy.unaPista.clues}</h2>
          <ClueList clues={clues} />
        </>
      ) : null}
    </GameScreen>
  );
}

/** Marcador final del equipo: "7 de 10" y una frase según el tramo. */
export function ResultScreen({
  score,
  total,
  ...chrome
}: GameScreenProps & { score: number; total: number }) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left" tone={score === total ? 'lime' : 'paper'} grow>
        <div className="flex flex-1 flex-col justify-center gap-4">
          <Pill tone="lime">{copy.unaPista.scorePill}</Pill>
          <h1 className="font-display text-display-md uppercase">
            {copy.unaPista.score(score, total)}
          </h1>
          <p className="text-lead font-medium">{copy.unaPista.verdict(score, total)}</p>
        </div>
      </Card>
    </GameScreen>
  );
}

type MarkControlsProps = {
  isArbiter: boolean;
  waiting: string;
  busy: boolean;
  error?: string;
  onMark: (result: NonNullable<UnaPistaGameState['result']>) => void;
};

/** El árbitro marca la respuesta que el adivino ha dicho en voz alta. */
export function MarkControls({ isArbiter, waiting, busy, error, onMark }: MarkControlsProps) {
  if (!isArbiter) return <WaitingBox>{waiting}</WaitingBox>;
  const button = (result: NonNullable<UnaPistaGameState['result']>, children: ReactNode) => (
    <div className="flex flex-1">
      <Button
        variant={result === 'correct' ? 'primary' : 'secondary'}
        fullWidth
        disabled={busy}
        onClick={() => {
          onMark(result);
        }}
      >
        {children}
      </Button>
    </div>
  );
  return (
    <>
      <p className="text-md font-medium">{copy.unaPista.markHint}</p>
      {error ? (
        <p role="alert" className="animate-caer text-md font-bold">
          {error}
        </p>
      ) : null}
      {button('correct', copy.unaPista.correct)}
      <div className="flex gap-3">
        {button('wrong', copy.unaPista.wrong)}
        {button('pass', copy.unaPista.pass)}
      </div>
    </>
  );
}
