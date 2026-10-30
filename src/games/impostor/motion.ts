import type { Transition } from '@/lib/motion';
import type { ImpostorGameState } from '@/lib/snapshot';

/**
 * Lo que se anima en El impostor (docs/PLAN-8.md §5). Solo mira lo que todos ven igual: quién ha
 * votado, el resultado de la votación y el final. Nunca el rol, la palabra ni la pista.
 */
export type ImpostorMotion =
  { type: 'voted'; userId: string } | { type: 'reveal' } | { type: 'tie' } | { type: 'result' };

function impostorOf(transition: Transition): [ImpostorGameState, ImpostorGameState] | null {
  const before = transition.previous.game;
  const after = transition.next.game;
  if (before?.type !== 'impostor' || after?.type !== 'impostor' || before.id !== after.id) {
    return null;
  }
  return [before, after];
}

export function impostorMotion(transition: Transition | null): ImpostorMotion[] {
  if (!transition) return [];
  const games = impostorOf(transition);
  if (!games) return [];
  const [before, after] = games;

  if (before.phase === 'voting' && after.phase === 'voting') {
    const votedBefore = new Set(
      before.participants.filter((p) => p.has_voted).map((p) => p.user_id),
    );
    return after.participants
      .filter((p) => p.has_voted && !votedBefore.has(p.user_id))
      .map((p) => ({ type: 'voted', userId: p.user_id }));
  }
  if (before.phase === after.phase) return [];
  if (after.phase === 'reveal') {
    return after.outcome?.type === 'tie' ? [{ type: 'tie' }] : [{ type: 'reveal' }];
  }
  if (after.phase === 'finished') return [{ type: 'result' }];
  return [];
}

/** Quiénes acaban de votar, en el orden de la partida. */
export function justVoted(events: readonly ImpostorMotion[]): string[] {
  return events.flatMap((event) => (event.type === 'voted' ? [event.userId] : []));
}

export function has(events: readonly ImpostorMotion[], type: 'reveal' | 'tie' | 'result'): boolean {
  return events.some((event) => event.type === type);
}
