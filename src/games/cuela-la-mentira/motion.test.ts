import { describe, expect, it } from 'vitest';
import { transitionOf } from '@/lib/motion';
import { cuelaIds, cuelaRevealOptions, cuelaVotingOptions, inCuela } from '@/test/fixtures';
import { cuelaMotion } from './motion';

const voting = inCuela({ phase: 'voting', options: cuelaVotingOptions });
const reveal = inCuela({ phase: 'reveal', options: cuelaRevealOptions });

function motion(previous: ReturnType<typeof inCuela>, next: ReturnType<typeof inCuela>) {
  return cuelaMotion(transitionOf(previous, next, false));
}

describe('cuelaMotion', () => {
  it('al pasar de votar a la revelación, se revela', () => {
    expect(motion(voting, reveal)).toEqual([{ type: 'reveal' }]);
  });

  it('sin foto anterior, con movimiento reducido o en la misma fase, nada', () => {
    expect(cuelaMotion(transitionOf(null, reveal, false))).toEqual([]);
    expect(cuelaMotion(transitionOf(voting, reveal, true))).toEqual([]);
    expect(motion(reveal, reveal)).toEqual([]);
  });

  it('si la foto salta una ronda, nada', () => {
    expect(
      motion(voting, inCuela({ phase: 'reveal', round: 4, options: cuelaRevealOptions })),
    ).toEqual([]);
  });

  it('escribir y votar no animan nada, escriba o vote quien sea', () => {
    const writing = inCuela();
    const someoneWrote = inCuela({
      my: {
        is_participant: true,
        alive: true,
        answer: 'Para aislar cables',
        voted_option_id: null,
      },
    });
    const someoneVoted = inCuela({
      phase: 'voting',
      options: cuelaVotingOptions,
      my: { is_participant: true, alive: true, answer: null, voted_option_id: cuelaIds.truth },
    });
    expect(motion(writing, someoneWrote)).toEqual([]);
    expect(motion(writing, voting)).toEqual([]);
    expect(motion(voting, someoneVoted)).toEqual([]);
  });

  it('el autor de una mentira y quien no escribió ven lo mismo', () => {
    const asSpectator = (snapshot: ReturnType<typeof inCuela>) =>
      inCuela({
        ...(snapshot.game?.type === 'cuela_la_mentira' ? snapshot.game : {}),
        my: { is_participant: false, alive: false, answer: null, voted_option_id: null },
        options:
          (snapshot.game?.type === 'cuela_la_mentira' ? snapshot.game.options : null)?.map(
            (option) => ({ ...option, is_mine: false }),
          ) ?? null,
      });
    expect(motion(asSpectator(voting), asSpectator(reveal))).toEqual(motion(voting, reveal));
  });
});
