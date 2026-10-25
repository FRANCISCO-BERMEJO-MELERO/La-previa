import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { RoleRow } from './game-view';
import { RolesList } from './RolesList';

type Winner = 'village' | 'wolves' | 'jester' | 'killer';

type ResultScreenProps = GameScreenProps & {
  winner: Winner;
  /** Si quien mira ha ganado; nulo si no jugaba. */
  won: boolean | null;
  rows: readonly RoleRow[];
  lovers: readonly [string, string] | null;
};

// Los que juegan solos, en el color de su píldora de bando.
const winnerTone = { village: 'lime', wolves: 'tomato', jester: 'lilac', killer: 'lilac' } as const;

/** El final: bando ganador, el titular de cada uno y todos los roles. */
export function ResultScreen({ winner, won, rows, lovers, ...chrome }: ResultScreenProps) {
  const texts = copy.lunaLlena.result;
  const headline = won === null ? texts.winner[winner] : won ? copy.result.won : copy.result.lost;
  return (
    <GameScreen {...chrome}>
      <Card variant={won === false ? 'normal' : 'hero'} tilt="left">
        <Pill tone={winnerTone[winner]} caps>
          {texts.winner[winner]}
        </Pill>
        <h1 className="font-display text-display-sm uppercase">{headline}</h1>
        {lovers ? (
          <p className="text-base font-bold">{texts.lovers(lovers[0], lovers[1])}</p>
        ) : null}
      </Card>
      <section aria-labelledby="result-roles" className="flex flex-col gap-2">
        <h2 id="result-roles" className="font-display text-lg uppercase">
          {texts.rolesTitle}
        </h2>
        <RolesList rows={rows} />
      </section>
    </GameScreen>
  );
}
