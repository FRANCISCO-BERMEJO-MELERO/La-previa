'use client';

import { useEffect, useState } from 'react';
import { Die } from './Die';
import { FACE_MS, ROLL_MS } from './motion';

type RollingDieProps = {
  value: number;
  size?: 'md' | 'lg';
  /** Si acaba de salir: rueda y cae. El valor real ya está en la foto y es el que se lee. */
  rolling: boolean;
};

/** Una cara que nunca es la del valor real, para que no parezca que ya ha caído. */
function faceAt(value: number, step: number): number {
  return ((value + step * 2) % 6) + 1;
}

/**
 * «Tirada» (docs/PLAN-8.md §7): el dado rueda medio segundo cambiando de cara y cae con un golpe.
 * Es lo único que se mueve en bucle, y solo mientras rueda.
 */
export function RollingDie({ value, size = 'md', rolling }: RollingDieProps) {
  const [step, setStep] = useState<number | null>(rolling ? 0 : null);

  useEffect(() => {
    if (!rolling) return;
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      if (count * FACE_MS >= ROLL_MS) {
        clearInterval(timer);
        setStep(null);
        return;
      }
      setStep(count);
    }, FACE_MS);
    return () => {
      clearInterval(timer);
    };
  }, [rolling]);

  if (step === null) {
    return <Die value={value} size={size} motion={rolling ? 'animate-thump' : ''} />;
  }
  return <Die value={value} size={size} face={faceAt(value, step)} motion="animate-tumble" />;
}
