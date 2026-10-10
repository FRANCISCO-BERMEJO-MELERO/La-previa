import { copy } from '@/lib/copy';
import { clueSize } from './clue-size';
import type { ClueRow } from './game-view';

type ClueListProps = {
  clues: ClueRow[];
  /** Si se da, cada pista con autor es un botón que la anula o la recupera. */
  onToggle?: (userId: string) => void;
  busy?: boolean;
};

/** Pistas de la ronda: las anuladas, tachadas y con borde discontinuo. */
export function ClueList({ clues, onToggle, busy = false }: ClueListProps) {
  return (
    <ul className="flex flex-col gap-2.5">
      {clues.map((clue, index) => {
        const look = clue.cancelled ? 'border-dashed bg-ground-soft' : 'bg-paper';
        const body = (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              {clue.author ? (
                <span className="truncate text-sm font-bold">{clue.author.name}</span>
              ) : null}
              <span
                className={`font-display break-all ${clueSize(clue.text, 'text-xl')} ${clue.cancelled ? 'line-through decoration-4' : ''}`}
              >
                {clue.text}
              </span>
            </span>
            {clue.cancelled ? (
              <span className="shrink-0 text-label font-bold">{copy.unaPista.cancelled}</span>
            ) : null}
          </>
        );
        const key = clue.author?.userId ?? `${String(index)}-${clue.text}`;
        const author = clue.author;
        return (
          <li key={key}>
            {onToggle && author ? (
              <button
                type="button"
                aria-pressed={clue.cancelled}
                aria-label={
                  clue.cancelled
                    ? copy.unaPista.restore(author.name, clue.text)
                    : copy.unaPista.cancel(author.name, clue.text)
                }
                disabled={busy}
                onClick={() => {
                  onToggle(author.userId);
                }}
                className={`flex min-h-15 w-full items-center gap-3 rounded-chip border-3 border-ink px-3 py-2 text-left ${look}`}
              >
                {body}
              </button>
            ) : (
              <div
                className={`flex min-h-15 items-center gap-3 rounded-chip border-3 border-ink px-3 py-2 ${look}`}
              >
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
