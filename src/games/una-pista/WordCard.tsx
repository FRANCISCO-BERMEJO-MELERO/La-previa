import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';

/** Tarjeta protagonista con la palabra secreta y su categoría. */
export function WordCard({ word, category }: { word: string; category: string }) {
  return (
    <Card variant="hero" tilt="left">
      <Pill tone="lime">{copy.unaPista.wordPill}</Pill>
      <p className={`font-display uppercase ${fitDisplay(word, 'text-display-md')}`}>{word}</p>
      <p className="text-sm font-bold">{copy.unaPista.category(category)}</p>
    </Card>
  );
}
