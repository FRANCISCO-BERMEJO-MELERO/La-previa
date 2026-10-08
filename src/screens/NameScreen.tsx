import type { SubmitEvent } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { copy } from '@/lib/copy';

export const NAME_MAX_LENGTH = 14;

type NameScreenProps = {
  /** Sala a la que se entra; al crear una sala todavía no hay código. */
  roomCode?: string;
  name: string;
  error?: string;
  busy: boolean;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
};

export function NameScreen({
  roomCode,
  name,
  error,
  busy,
  onNameChange,
  onSubmit,
}: NameScreenProps) {
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Screen brand={copy.brand} aside={roomCode ? <Pill>{copy.room.pill(roomCode)}</Pill> : null}>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-5">
        <h1 className="mt-12 font-display text-display-md uppercase">{copy.name.title}</h1>
        <Card>
          <TextField
            id="player-name"
            label={copy.name.label}
            value={name}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="nickname"
            enterKeyHint="go"
            error={error}
            onChange={(event) => {
              onNameChange(event.target.value);
            }}
          />
        </Card>
        <p className="text-base font-medium">{copy.name.hint}</p>
        <div className="mt-auto flex">
          <Button type="submit" fullWidth disabled={busy || name.trim() === ''}>
            {copy.name.submit}
          </Button>
        </div>
      </form>
    </Screen>
  );
}
