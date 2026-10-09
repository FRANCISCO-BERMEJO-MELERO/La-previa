import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';

/** Tarjeta protagonista con la pregunta de la ronda. */
export function QuestionCard({ prompt }: { prompt: string }) {
  return (
    <Card variant="hero" tilt="left">
      <Pill tone="lilac">{copy.quienLoDijo.question}</Pill>
      <h1 className="font-display text-2xl">{prompt}</h1>
    </Card>
  );
}

/** La respuesta elegida, sin autor, entre comillas. */
export function FeaturedCard({ text, label }: { text: string; label: string }) {
  return (
    <Card variant="hero" tilt="right">
      <Pill tone="lilac">{label}</Pill>
      <p className="font-display text-2xl">{copy.quienLoDijo.quoted(text)}</p>
    </Card>
  );
}
