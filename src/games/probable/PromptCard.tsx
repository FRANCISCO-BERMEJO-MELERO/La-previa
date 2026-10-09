import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';

/** Tarjeta protagonista con la pregunta de la ronda. */
export function PromptCard({ prompt }: { prompt: string }) {
  return (
    <Card variant="hero" tilt="left">
      <Pill tone="sky">{copy.probable.question}</Pill>
      <h1 className="font-display text-2xl">{copy.probable.prompt(prompt)}</h1>
    </Card>
  );
}
