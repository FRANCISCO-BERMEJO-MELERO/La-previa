import type { Transition } from '@/lib/motion';
import type { LunaLlenaGameState } from '@/lib/snapshot';

/**
 * Lo que se anima en El lobo (docs/PLAN-8.md §6). Solo mira lo que es igual para todos los
 * presentes: la fase, quién ha muerto según el anuncio y los votos públicos. Nunca `my`, ni las
 * causas reales que ven los muertos, ni lo que hace cada uno de noche.
 */
export type LunaMotion =
  | { type: 'curtain'; direction: 'down' | 'up' }
  | { type: 'death'; userId: string }
  | { type: 'quiet' }
  | { type: 'votes'; kind: 'mayor' | 'accuse' }
  | { type: 'verdict' }
  | { type: 'result' };

function lunaOf(transition: Transition): [LunaLlenaGameState, LunaLlenaGameState] | null {
  const before = transition.previous.game;
  const after = transition.next.game;
  if (before?.type !== 'luna_llena' || after?.type !== 'luna_llena' || before.id !== after.id) {
    return null;
  }
  return [before, after];
}

function deathIds(game: LunaLlenaGameState): string[] {
  return (game.announcement?.deaths ?? []).map((death) => death.user_id);
}

/** Muertes que el anuncio trae nuevas, en su orden: las que se pintan en el amanecer o la horca. */
function newDeaths(before: LunaLlenaGameState, after: LunaLlenaGameState): LunaMotion[] {
  if (after.phase !== 'dawn' && after.phase !== 'execution') return [];
  const known = new Set(
    before.announcement?.kind === after.announcement?.kind ? deathIds(before) : [],
  );
  return deathIds(after)
    .filter((userId) => !known.has(userId))
    .map((userId) => ({ type: 'death', userId }));
}

export function lunaMotion(transition: Transition | null): LunaMotion[] {
  if (!transition) return [];
  const games = lunaOf(transition);
  if (!games) return [];
  const [before, after] = games;
  const events: LunaMotion[] = [];

  if (before.phase !== after.phase) {
    if (after.phase === 'night') events.push({ type: 'curtain', direction: 'down' });
    if (before.phase === 'night' && after.phase === 'dawn') {
      events.push({ type: 'curtain', direction: 'up' });
      if (deathIds(after).length === 0) events.push({ type: 'quiet' });
    }
    if (before.phase === 'mayor' && after.phase === 'day') {
      events.push({ type: 'votes', kind: 'mayor' });
    }
    if (before.phase === 'voting' && after.phase === 'defense') {
      events.push({ type: 'votes', kind: 'accuse' });
    }
    if (before.phase === 'defense' && after.phase === 'execution') events.push({ type: 'verdict' });
    if (after.phase === 'finished') events.push({ type: 'result' });
  }
  return [...events, ...newDeaths(before, after)];
}

/** Las muertes que caen, en orden. */
export function fallenIds(events: readonly LunaMotion[]): string[] {
  return events.flatMap((event) => (event.type === 'death' ? [event.userId] : []));
}

export function curtainOf(events: readonly LunaMotion[]): 'down' | 'up' | null {
  for (const event of events) if (event.type === 'curtain') return event.direction;
  return null;
}

export function has(events: readonly LunaMotion[], type: 'quiet' | 'verdict' | 'result'): boolean {
  return events.some((event) => event.type === type);
}

export function closedVote(events: readonly LunaMotion[]): 'mayor' | 'accuse' | null {
  for (const event of events) if (event.type === 'votes') return event.kind;
  return null;
}
