import { copy } from '@/lib/copy';
import type { LunaLlenaGameState } from '@/lib/snapshot';

/** Qué hace el botón del narrador en cada fase. */
export type NarratorStep = 'continue' | 'close_night' | 'close_vote' | 'skip_hunter';

export type NarratorAction = { step: NarratorStep; label: string };

/** El botón de avanzar que toca; al terminar no hay, porque mandan volver a jugar o cambiar. */
export function narratorAction(game: LunaLlenaGameState): NarratorAction | null {
  const labels = copy.lunaLlena.narrator;
  switch (game.phase) {
    case 'roles':
      return { step: 'continue', label: labels.startNight };
    case 'night':
      return { step: 'close_night', label: labels.forceDawn };
    case 'dawn':
    case 'execution':
      return { step: 'continue', label: labels.next };
    case 'hunter':
      return { step: 'skip_hunter', label: labels.skipHunter };
    case 'mayor':
    case 'voting':
      return { step: 'close_vote', label: labels.closeVote };
    case 'day':
      return { step: 'continue', label: labels.openVoting };
    case 'defense':
      return {
        step: 'continue',
        label: game.accused_id ? labels.toGallows : labels.startNight,
      };
    case 'finished':
      return null;
  }
}
