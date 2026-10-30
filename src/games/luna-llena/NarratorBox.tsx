import { Button } from '@/components/Button';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';

type NarratorBoxProps = {
  /** Las frases del guion que tocan ahora. */
  lines: readonly string[];
  /** El botón de avanzar; sin él, solo se lee. */
  actionLabel: string | null;
  busy: boolean;
  error?: string;
  onAction: () => void;
};

/** Caja del anfitrión: el guion que lee en voz alta y el botón que avanza la partida. */
export function NarratorBox({ lines, actionLabel, busy, error, onAction }: NarratorBoxProps) {
  return (
    <section
      aria-labelledby="narrator-title"
      className="flex flex-col gap-3 rounded-card border-3 border-ink bg-lilac p-4 shadow-hard"
    >
      <Pill caps>
        <span id="narrator-title">{copy.lunaLlena.narrator.title}</span>
      </Pill>
      {lines.map((line) => (
        <p key={line} className="text-lead font-bold">
          {line}
        </p>
      ))}
      {error ? (
        <p role="alert" className="animate-caer text-md font-bold">
          {error}
        </p>
      ) : null}
      {actionLabel ? (
        <Button fullWidth disabled={busy} onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
