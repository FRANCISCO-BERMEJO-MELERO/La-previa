import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { AFTER_ENTRY_MS, delayClass, motionMs } from '@/lib/motion';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { VoteGroupList } from './DayScreens';
import { DeathCard, type Death } from './DeathCard';
import { fallDelays } from './fall';
import type { VoteGroup } from './game-view';

const texts = copy.lunaLlena;

type ExecutionScreenProps = GameScreenProps & {
  deaths: readonly Death[];
  /** Quién votó a quién en la acusación; vacío si el anuncio no es de un juicio. */
  groups: readonly VoteGroup[];
  /** El anuncio es de alguien que se ha ido de la sala. */
  left: boolean;
  /** Se acaba de dictar: el recuento cuenta (docs/PLAN-8.md §6). */
  verdict?: boolean;
  /** Muertos que caen con su sello: el ahorcado o la víctima del cazador. */
  fallen?: readonly string[];
};

/** El sello de cada muerto en la horca; quien se ha ido no lleva. */
function stampOf(death: Death): string | undefined {
  if (death.cause === 'left') return undefined;
  return death.cause === 'hanged' ? texts.dawn.causes.hanged : texts.dawn.deadStamp;
}

/** Quién sube a la horca, o quién se ha ido, con su carta y los votos de la acusación. */
export function ExecutionScreen({
  deaths,
  groups,
  left,
  verdict = false,
  fallen = [],
  ...chrome
}: ExecutionScreenProps) {
  const title = left ? texts.execution.left : texts.execution.hanged;
  const delays = fallDelays(fallen, AFTER_ENTRY_MS);
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <Pill tone="tomato" caps>
          {left ? texts.execution.left : texts.execution.pill}
        </Pill>
        <h1 className="font-display text-display-xs uppercase">{title}</h1>
        <ul className="flex flex-col gap-4 pt-2">
          {deaths.map((death) => {
            const delay = delays.get(death.user_id);
            return (
              <li
                key={death.user_id}
                className={delay === undefined ? '' : `animate-caer ${delayClass(delay)}`}
              >
                <DeathCard
                  death={death}
                  stamp={stampOf(death)}
                  stampDelay={delay === undefined ? null : delay + motionMs.base}
                />
              </li>
            );
          })}
        </ul>
      </Card>
      {groups.length > 0 ? (
        <section aria-labelledby="execution-votes" className="flex flex-col gap-3">
          <h2 id="execution-votes" className="font-display text-lg uppercase">
            {texts.defense.votesTitle}
          </h2>
          <VoteGroupList
            groups={groups}
            highlightId={deaths[0]?.user_id ?? null}
            animate={verdict}
          />
        </section>
      ) : null}
    </GameScreen>
  );
}
