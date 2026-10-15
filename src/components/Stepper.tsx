import { copy } from '@/lib/copy';

type StepperProps = {
  /** Base de los identificadores del rótulo. */
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  fewerLabel: string;
  moreLabel: string;
  onChange: (value: number) => void;
};

/** Un número con botones para restar y sumar dentro de sus límites. */
export function Stepper({
  id,
  label,
  value,
  min,
  max,
  fewerLabel,
  moreLabel,
  onChange,
}: StepperProps) {
  return (
    <div className="flex items-center justify-between rounded-chip border-3 border-ink bg-paper px-3.5 py-2">
      <p className="text-base font-bold" id={`${id}-label`}>
        {label}
      </p>
      <div className="flex items-center gap-3.5">
        <StepButton
          label={fewerLabel}
          disabled={value <= min}
          onClick={() => {
            onChange(value - 1);
          }}
        >
          {copy.lobby.minus}
        </StepButton>
        <output aria-labelledby={`${id}-label`} className="font-display text-title">
          {value}
        </output>
        <StepButton
          label={moreLabel}
          disabled={value >= max}
          onClick={() => {
            onChange(value + 1);
          }}
        >
          {copy.lobby.plus}
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-control border-3 border-ink bg-paper text-2xl font-bold disabled:border-dashed disabled:bg-ground-soft"
    >
      {children}
    </button>
  );
}
