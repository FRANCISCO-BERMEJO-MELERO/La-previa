import { copy } from '@/lib/copy';
import { Pill } from './Pill';

export type HeaderTone = 'paper' | 'tomato' | 'sky' | 'lilac' | 'lime' | 'orange';

type HeaderAsideProps = {
  /** Dónde estás: la sala, el juego o la ronda. Solo informa. */
  label: string;
  tone?: HeaderTone;
  tilted?: boolean;
  /** Si llega, la píldora es un botón para cambiar lo que nombra (el juego, en la sala). */
  onChange?: () => void;
  onLeave: () => void;
};

const toneClasses: Record<HeaderTone, string> = {
  paper: 'bg-paper',
  tomato: 'bg-tomato',
  sky: 'bg-sky',
  lilac: 'bg-lilac',
  lime: 'bg-lime',
  orange: 'bg-orange',
};

/**
 * Cabecera de la sala: "Salir" a la derecha de la marca y, en su propia fila, la píldora que
 * informa. `contents` hace que ambos ocupen su sitio en la cabecera, que se reparte en dos filas.
 */
export function HeaderAside({
  label,
  tone = 'paper',
  tilted = false,
  onChange,
  onLeave,
}: HeaderAsideProps) {
  return (
    <div className="contents">
      <div className="order-last basis-full">
        {onChange ? (
          <button
            type="button"
            aria-label={copy.room.changeLabel(label)}
            onClick={onChange}
            className={`press inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border-3 border-ink py-1 pr-1 pl-4 text-label font-bold text-ink shadow-hard ${toneClasses[tone]} ${tilted ? 'tilt-pill-left' : ''}`}
          >
            <span className="min-w-0 truncate">{label}</span>
            <span className="shrink-0 rounded-full border-3 border-ink bg-paper px-3 py-0.5 uppercase tracking-label">
              {copy.room.change}
            </span>
          </button>
        ) : (
          <Pill tone={tone} tilted={tilted}>
            {label}
          </Pill>
        )}
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
