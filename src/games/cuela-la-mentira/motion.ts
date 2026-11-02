import type { Transition } from '@/lib/motion';

/**
 * Lo que se anima en Cuela la mentira (docs/PLAN-9.md §7): solo la llegada a la revelación, que
 * todos ven igual. Mientras se escribe y se vota no se anima nada que dependa de lo que hace cada uno.
 */
export type CuelaMotion = { type: 'reveal' };

export function cuelaMotion(transition: Transition | null): CuelaMotion[] {
  const before = transition?.previous.game;
  const after = transition?.next.game;
  if (before?.type !== 'cuela_la_mentira' || after?.type !== 'cuela_la_mentira') return [];
  if (before.id !== after.id || before.round !== after.round) return [];
  return before.phase === 'voting' && after.phase === 'reveal' ? [{ type: 'reveal' }] : [];
}
