import { motionMs, sequenceDelays } from '@/lib/motion';

/**
 * Cuándo cae cada muerto, por su id, empezando en `start`. Cada paso es caer y plantar el sello, y
 * la secuencia entera, de la primera caída al último sello, cabe en 1,6 s.
 */
export function fallDelays(ids: readonly string[], start: number): Map<string, number> {
  const delays = sequenceDelays(ids.length, motionMs.base + motionMs.lento);
  return new Map(ids.map((id, index) => [id, start + (delays[index] ?? 0)]));
}
