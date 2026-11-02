import type { SubmitEvent } from 'react';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { QuestionCard } from './cards';

export const LIE_MAX_LENGTH = 80;

type WriteScreenProps = Omit<GameScreenProps, 'footer'> & {
  question: string;
  value: string;
  busy: boolean;
  /** Error de cualquier acción, salvo el de haber escrito la verdad. */
  error?: string;
  /** Ha escrito la verdad: se avisa sin borrar lo escrito. */
  truthWarning?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

/** La pregunta y el campo para inventarse la mentira, que no se cambia una vez enviada. */
export function WriteScreen({
  question,
  value,
  busy,
  error,
  truthWarning,
  onChange,
  onSubmit,
  ...chrome
}: WriteScreenProps) {
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <GameScreen
      {...chrome}
      footer={
        <Button type="submit" form="lie-form" fullWidth disabled={busy || value.trim() === ''}>
          {copy.cuela.send}
        </Button>
      }
    >
      <QuestionCard question={question} />
      <form id="lie-form" onSubmit={submit} className="flex flex-col gap-3">
        <TextField
          id="lie"
          label={copy.cuela.answerLabel}
          value={value}
          maxLength={LIE_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="send"
          error={error}
          aria-describedby={error ? 'lie-error lie-count' : 'lie-count'}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
        <p id="lie-count" className="self-end text-sm font-bold">
          {copy.cuela.count(value.length, LIE_MAX_LENGTH)}
        </p>
        {truthWarning ? (
          <p
            role="alert"
            className="animate-caer rounded-control border-3 border-ink bg-orange p-3 text-md font-bold"
          >
            {truthWarning}
          </p>
        ) : null}
        <p className="text-md font-medium">{copy.cuela.answerHint}</p>
      </form>
    </GameScreen>
  );
}
