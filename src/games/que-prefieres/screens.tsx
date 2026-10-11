import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import type { QuePrefieresOption } from '@/lib/snapshot';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { OptionRow } from './game-view';

type ChooseScreenProps = Omit<GameScreenProps, 'footer'> & {
  options: OptionRow[];
  selected: QuePrefieresOption | null;
  busy: boolean;
  error?: string;
  onSelect: (option: QuePrefieresOption) => void;
  onChoose: () => void;
};

/** El dilema con sus dos opciones. La elección no se cambia una vez enviada. */
export function ChooseScreen({
  options,
  selected,
  busy,
  error,
  onSelect,
  onChoose,
  ...chrome
}: ChooseScreenProps) {
  return (
    <GameScreen
      {...chrome}
      footer={
        <Button fullWidth disabled={busy || !selected} onClick={onChoose}>
          {selected ? copy.quePrefieres.submit(selected) : copy.quePrefieres.choose}
        </Button>
      }
    >
      <h1 className="font-display text-4xl uppercase">{copy.quePrefieres.question}</h1>
      <ul className="flex flex-col gap-3">
        {options.map((row, index) => {
          const pressed = row.option === selected;
          return (
            <li key={row.option} className="flex flex-col gap-3">
              {index > 0 ? (
                <p aria-hidden="true" className="text-center font-display text-2xl uppercase">
                  {copy.quePrefieres.or}
                </p>
              ) : null}
              <button
                type="button"
                aria-pressed={pressed}
                aria-label={copy.quePrefieres.optionLabel(row.option, row.text)}
                onClick={() => {
                  onSelect(row.option);
                }}
                className={`flex min-h-28 w-full items-center gap-4 rounded-card border-3 border-ink p-4 text-left ${
                  pressed ? 'bg-ink text-paper shadow-hard-tomato' : 'bg-paper shadow-hard'
                }`}
              >
                <OptionLetter option={row.option} inverted={pressed} />
                <span className="min-w-0 flex-1 text-xl font-bold">{row.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="text-md font-bold">
          {error}
        </p>
      ) : null}
      <p className="text-md font-medium">{copy.quePrefieres.chooseHint}</p>
    </GameScreen>
  );
}

type RevealScreenProps = GameScreenProps & {
  options: OptionRow[];
};

/** Reparto de la ronda: cuántos y quiénes han elegido cada opción, y quién puntúa. */
export function RevealScreen({ options, ...chrome }: RevealScreenProps) {
  const majority = options.find((row) => row.majority);
  const nobody = options.every((row) => row.choosers.length === 0);
  const title = majority
    ? majority.text
    : nobody
      ? copy.quePrefieres.nobody
      : copy.quePrefieres.tie;
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="right" tone={majority ? 'lime' : 'paper'}>
        <Pill tone="orange" caps>
          {majority ? copy.quePrefieres.majorityPill : copy.quePrefieres.question}
        </Pill>
        <h1 className={`font-display uppercase ${fitDisplay(title, 'text-display-sm')}`}>
          {title}
        </h1>
        <p className="text-md font-medium">
          {majority
            ? copy.quePrefieres.count(majority.choosers.length)
            : nobody
              ? copy.quePrefieres.nobodyText
              : copy.quePrefieres.tieText}
        </p>
      </Card>
      <ul className="flex flex-col gap-3">
        {options.map((row) => (
          <li
            key={row.option}
            className={`flex items-start gap-3 rounded-chip border-3 border-ink p-3 ${row.majority ? 'bg-lime' : 'bg-paper'}`}
          >
            <OptionLetter option={row.option} inverted={false} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-base font-bold">{row.text}</span>
              <span className="text-sm font-bold">
                {copy.quePrefieres.count(row.choosers.length)}
              </span>
              <span className="text-xs font-medium">
                {row.choosers.length > 0
                  ? copy.rounds.names(row.choosers.map((player) => player.name))
                  : copy.quePrefieres.none}
              </span>
            </div>
            {row.majority ? (
              <span className="shrink-0 rounded-full border-3 border-ink bg-paper px-2 font-display text-base">
                {copy.quePrefieres.point}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </GameScreen>
  );
}

function OptionLetter({ option, inverted }: { option: QuePrefieresOption; inverted: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-11 shrink-0 items-center justify-center rounded-control border-3 font-display text-2xl ${
        inverted ? 'border-paper bg-paper text-ink' : 'border-ink bg-orange'
      }`}
    >
      {copy.quePrefieres.letter(option)}
    </span>
  );
}
