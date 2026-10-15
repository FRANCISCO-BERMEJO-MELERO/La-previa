import type { ReactNode } from 'react';

type PillTone =
  'paper' | 'tomato' | 'sky' | 'lime' | 'lilac' | 'orange' | 'ground-soft' | 'field-error';

type PillProps = {
  tone?: PillTone;
  /** Las píldoras de cabecera que destacan van giradas. */
  tilted?: boolean;
  /** Etiqueta en mayúsculas con espaciado, como las de las tarjetas. */
  caps?: boolean;
  /** Sobre fondo `ink` el borde pasa a blanco. */
  onDark?: boolean;
  children: ReactNode;
};

const toneClasses: Record<PillTone, string> = {
  paper: 'bg-paper',
  tomato: 'bg-tomato',
  sky: 'bg-sky',
  lime: 'bg-lime',
  lilac: 'bg-lilac',
  orange: 'bg-orange',
  'ground-soft': 'bg-ground-soft',
  'field-error': 'bg-field-error',
};

export function Pill({
  tone = 'paper',
  tilted = false,
  caps = false,
  onDark = false,
  children,
}: PillProps) {
  const rotation = tilted ? 'tilt-pill-left' : '';
  const letters = caps ? 'uppercase tracking-label' : '';
  const border = onDark ? 'border-paper' : 'border-ink';
  return (
    <span
      className={`inline-flex items-center self-start rounded-full border-3 px-3 py-1 text-label font-bold text-ink ${border} ${toneClasses[tone]} ${rotation} ${letters}`}
    >
      {children}
    </span>
  );
}
