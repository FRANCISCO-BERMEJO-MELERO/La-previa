import { copy } from '@/lib/copy';
import { Pill } from './Pill';

export type HeaderTone = 'paper' | 'tomato' | 'sky' | 'lilac' | 'lime' | 'orange';

type HeaderAsideProps = {
  /** Dónde estás: la sala, el juego o la ronda. Solo informa. */
  label: string;
  tone?: HeaderTone;
  tilted?: boolean;
  onLeave: () => void;
};

/**
 * Cabecera de la sala: "Salir" a la derecha de la marca y, en su propia fila, la píldora que
 * informa. `contents` hace que ambos ocupen su sitio en la cabecera, que se reparte en dos filas.
 */
export function HeaderAside({ label, tone = 'paper', tilted = false, onLeave }: HeaderAsideProps) {
  return (
    <div className="contents">
      <div className="order-last basis-full">
        <Pill tone={tone} tilted={tilted}>
          {label}
        </Pill>
      </div>
      <button
        type="button"
        aria-label={copy.room.leave}
        aria-haspopup="dialog"
        onClick={onLeave}
        className="min-h-11 rounded-full border-3 border-ink bg-paper px-4 text-label font-bold text-ink"
      >
        {copy.room.leaveShort}
      </button>
    </div>
  );
}
