import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { VoteGroupList } from './DayScreens';
import { DeathCard, type Death } from './DeathCard';
import type { VoteGroup } from './game-view';

const texts = copy.lunaLlena;

type ExecutionScreenProps = GameScreenProps & {
  deaths: readonly Death[];
  /** Quién votó a quién en la acusación; vacío si el anuncio no es de un juicio. */
  groups: readonly VoteGroup[];
  /** El anuncio es de alguien que se ha ido de la sala. */
  left: boolean;
};

/** Quién sube a la horca, o quién se ha ido, con su carta y los votos de la acusación. */
export function ExecutionScreen({ deaths, groups, left, ...chrome }: ExecutionScreenProps) {
  const title = left ? texts.execution.left : texts.execution.hanged;
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <Pill tone="tomato" caps>
          {left ? texts.execution.left : texts.execution.pill}
        </Pill>
        <h1 className="font-display text-display-xs uppercase">{title}</h1>
        <ul className="flex flex-col gap-3">
          {deaths.map((death) => (
            <li key={death.user_id}>
              <DeathCard death={death} />
            </li>
          ))}
        </ul>
      </Card>
      {groups.length > 0 ? (
        <section aria-labelledby="execution-votes" className="flex flex-col gap-3">
          <h2 id="execution-votes" className="font-display text-lg uppercase">
            {texts.defense.votesTitle}
          </h2>
          <VoteGroupList groups={groups} highlightId={deaths[0]?.user_id ?? null} />
        </section>
      ) : null}
    </GameScreen>
  );
}
