import { Button } from '@/components/Button';
import { copy } from '@/lib/copy';
import type { CuelaOption } from '@/lib/snapshot';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';

type VoteScreenProps = Omit<GameScreenProps, 'footer'> & {
  question: string;
  /** En el orden barajado, el mismo para todos. */
  options: CuelaOption[];
  selected: string | null;
  busy: boolean;
  error?: string;
  onSelect: (optionId: string) => void;
  onVote: () => void;
};

/** Las opciones sin nada que distinga la verdad; la propia se ve pero no se puede votar. */
export function VoteScreen({
  question,
  options,
  selected,
  busy,
  error,
  onSelect,
  onVote,
  ...chrome
}: VoteScreenProps) {
  const target = options.find((option) => option.id === selected && !option.is_mine);
  return (
    <GameScreen
      {...chrome}
      footer={
        <Button fullWidth disabled={busy || !target} onClick={onVote}>
          {target ? copy.cuela.submit : copy.cuela.choose}
        </Button>
      }
    >
      <p className="text-md font-bold wrap-break-word">{question}</p>
      <h1 className="font-display text-2xl uppercase">{copy.cuela.voteTitle}</h1>
      <ul className="flex flex-col gap-3">
        {options.map((option) => (
          <li key={option.id}>
            <OptionButton
              option={option}
              pressed={option.id === target?.id}
              onSelect={() => {
                onSelect(option.id);
              }}
            />
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="animate-caer text-md font-bold">
          {error}
        </p>
      ) : null}
      <p className="text-md font-medium">{copy.cuela.voteHint}</p>
    </GameScreen>
  );
}

function OptionButton({
  option,
  pressed,
  onSelect,
}: {
  option: CuelaOption;
  pressed: boolean;
  onSelect: () => void;
}) {
  const mine = option.is_mine === true;
  const look = mine
    ? 'border-dashed bg-ground-soft'
    : pressed
      ? 'bg-ink text-paper shadow-hard-tomato'
      : 'bg-paper';
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={mine}
      onClick={onSelect}
      className={`flex min-h-15 w-full flex-col items-start gap-1 rounded-chip border-3 border-ink px-4 py-3 text-left text-lg font-bold ${look}`}
    >
      {mine ? (
        <span className="text-label uppercase tracking-label">{copy.cuela.yourLie}</span>
      ) : null}
      <span className="w-full wrap-break-word">{option.text}</span>
      {pressed ? (
        <span className="rounded-full bg-ground px-2.5 py-1 text-label text-ink">
          {copy.cuela.yourVote}
        </span>
      ) : null}
    </button>
  );
}
