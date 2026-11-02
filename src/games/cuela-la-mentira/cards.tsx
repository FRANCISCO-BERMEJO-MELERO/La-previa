import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';

/** Tarjeta protagonista con la pregunta de la ronda, encabezado de la pantalla de escribir. */
export function QuestionCard({ question }: { question: string }) {
  return (
    <Card variant="hero" tilt="left">
      <Pill tone="sky">{copy.cuela.question}</Pill>
      <h1 className="font-display text-2xl wrap-break-word">{question}</h1>
    </Card>
  );
}

/** Lo que ha enviado quien mira: su mentira o la opción que ha votado. */
export function MineChip({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-chip border-3 border-ink bg-paper p-3">
      <span className="text-label font-bold uppercase tracking-label">{label}</span>
      <span className="text-base font-bold wrap-break-word">{copy.cuela.quoted(text)}</span>
    </div>
  );
}
