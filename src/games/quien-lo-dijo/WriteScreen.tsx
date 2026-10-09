import type { SubmitEvent } from 'react';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { QuestionCard } from './cards';

export const ANSWER_MAX_LENGTH = 80;

type WriteScreenProps = Omit<GameScreenProps, 'footer'> & {
  prompt: string;
  value: string;
  busy: boolean;
  error?: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

/** Pregunta y campo de respuesta. La respuesta no se cambia una vez enviada. */
export function WriteScreen({
  prompt,
  value,
  busy,
  error,
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
        <Button type="submit" form="answer-form" fullWidth disabled={busy || value.trim() === ''}>
          {copy.quienLoDijo.send}
        </Button>
      }
    >
      <QuestionCard prompt={prompt} />
      <form id="answer-form" onSubmit={submit} className="flex flex-col gap-3">
        <TextField
          id="answer"
          label={copy.quienLoDijo.answerLabel}
          value={value}
          maxLength={ANSWER_MAX_LENGTH}
          autoComplete="off"
          enterKeyHint="send"
          error={error}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
        <p className="text-md font-medium">{copy.quienLoDijo.answerHint}</p>
      </form>
    </GameScreen>
  );
}
