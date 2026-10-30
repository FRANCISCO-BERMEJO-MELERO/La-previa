'use client';

import { useCountUp } from '@/lib/use-count-up';

type CountProps = {
  value: number;
  /** El valor de la foto anterior, si hay que contar desde él. */
  from: number | null;
  delay?: number;
  /** Cómo se escribe el número, si lleva texto alrededor. */
  format?: (value: number) => string;
};

/**
 * Un número que cuenta hasta su valor. Mientras cuenta, los lectores de pantalla leen ya el valor
 * final; quieto, es el texto de siempre.
 */
export function Count({ value, from, delay = 0, format = String }: CountProps) {
  const shown = useCountUp(from, value, delay);
  if (from === null || from === value) return format(value);
  return (
    <>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
