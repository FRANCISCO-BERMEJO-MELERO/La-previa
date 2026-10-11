'use client';

import { useState } from 'react';
import { Dialog } from '@/components/Dialog';
import { copy } from '@/lib/copy';
import type { GameId } from '@/lib/snapshot';

type HowToPlayDialogProps = {
  open: boolean;
  game: GameId;
  onClose: () => void;
};

/** Mini tutorial del juego elegido, paso a paso. */
export function HowToPlayDialog({ open, game, onClose }: HowToPlayDialogProps) {
  return (
    <Dialog
      open={open}
      title={copy.howTo.title(copy.games[game].name)}
      closeLabel={copy.howTo.close}
      onClose={onClose}
    >
      <Steps game={game} />
    </Dialog>
  );
}

// Solo existe con el diálogo abierto: al volver a abrirlo empieza por el primer paso.
function Steps({ game }: { game: GameId }) {
  const [index, setIndex] = useState(0);
  const steps = copy.howTo.steps[game];
  const step = steps[index];
  if (!step) return null;
  const last = index === steps.length - 1;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-label font-bold uppercase tracking-label">
        {copy.howTo.progress(index + 1, steps.length)}
      </p>
      <h3 className="font-display text-xl uppercase">{step.title}</h3>
      <p className="text-md font-medium">{step.text}</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => {
            setIndex(index - 1);
          }}
          className="h-12 rounded-control border-3 border-ink bg-paper text-md font-bold disabled:border-dashed disabled:bg-ground-soft"
        >
          {copy.howTo.previous}
        </button>
        <button
          type="button"
          disabled={last}
          onClick={() => {
            setIndex(index + 1);
          }}
          className="h-12 rounded-control border-3 border-ink bg-sky text-md font-bold disabled:border-dashed disabled:bg-ground-soft"
        >
          {copy.howTo.next}
        </button>
      </div>
    </div>
  );
}
