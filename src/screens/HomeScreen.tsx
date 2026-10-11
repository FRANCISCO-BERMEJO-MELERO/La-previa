import type { SubmitEvent } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { copy } from '@/lib/copy';
import { ROOM_CODE_LENGTH } from '@/lib/room-code';

type HomeScreenProps = {
  code: string;
  busy: boolean;
  onCodeChange: (value: string) => void;
  onJoin: () => void;
  onScan: () => void;
  onCreate: () => void;
};

export function HomeScreen({
  code,
  busy,
  onCodeChange,
  onJoin,
  onScan,
  onCreate,
}: HomeScreenProps) {
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onJoin();
  };

  return (
    <Screen brand={copy.brand} bare>
      <div className="flex flex-1 flex-col justify-center gap-4">
        <Pill tone="tomato" tilted>
          {copy.home.tagline}
        </Pill>
        <h1 className="font-display text-display-xl uppercase">
          {copy.home.title.split(' ').map((word) => (
            <span key={word} className="block">
              {word}
            </span>
          ))}
        </h1>
        <p className="text-lg font-medium">{copy.home.intro}</p>
      </div>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <TextField
            id="room-code"
            label={copy.home.codeLabel}
            variant="code"
            value={code}
            maxLength={ROOM_CODE_LENGTH}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(event) => {
              onCodeChange(event.target.value);
            }}
          />
          <Button
            type="submit"
            variant="accent"
            fullWidth
            disabled={busy || code.length < ROOM_CODE_LENGTH}
          >
            {copy.home.join}
          </Button>
        </form>
        <Button variant="secondary" fullWidth disabled={busy} onClick={onScan}>
          {copy.home.scan}
        </Button>
      </Card>
      <p className="text-center text-sm font-bold">{copy.home.or}</p>
      <Button fullWidth disabled={busy} onClick={onCreate}>
        {copy.home.create}
      </Button>
    </Screen>
  );
}
