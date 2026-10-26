import { copy } from '@/lib/copy';
import type { DieTone } from './game-view';

// Casillas de la rejilla de 3 × 3 con punto, como en un dado de verdad.
const pips: Record<number, readonly number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

const toneClasses: Record<DieTone, string> = {
  single: 'bg-paper',
  pair: 'bg-sky',
  trio: 'bg-lime',
};

type DieSize = 'md' | 'lg';

const sizeClasses: Record<DieSize, { box: string; pip: string }> = {
  md: { box: 'size-13 p-1.5', pip: 'size-2.5' },
  lg: { box: 'size-18 p-2.5', pip: 'size-3.5' },
};

type DieProps = {
  value: number;
  /** Solo en su columna, en pareja o en trío. */
  tone?: DieTone;
  size?: DieSize;
};

export function Die({ value, tone = 'single', size = 'md' }: DieProps) {
  const dots = pips[value] ?? [];
  return (
    <span
      role="img"
      aria-label={copy.dados.die(value)}
      data-tone={tone}
      className={`grid shrink-0 grid-cols-3 grid-rows-3 place-items-center rounded-control border-3 border-ink ${toneClasses[tone]} ${sizeClasses[size].box}`}
    >
      {CELLS.map((cell) => (
        <span
          key={cell}
          className={dots.includes(cell) ? `rounded-full bg-ink ${sizeClasses[size].pip}` : ''}
        />
      ))}
    </span>
  );
}

/** Hueco libre de una columna. */
export function EmptySlot() {
  return (
    <span
      aria-hidden="true"
      data-testid="empty-slot"
      className="size-13 shrink-0 rounded-control border-3 border-dashed border-ink"
    />
  );
}
