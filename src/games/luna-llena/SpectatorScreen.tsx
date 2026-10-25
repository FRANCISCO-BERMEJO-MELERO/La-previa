import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { DeathCard, type Death } from './DeathCard';
import type { RoleRow } from './game-view';
import { RolesList } from './RolesList';

const texts = copy.lunaLlena.spectator;

type SpectatorScreenProps = GameScreenProps & {
  rows: readonly RoleRow[];
  /** Nombres de los enamorados, si los hay. */
  lovers: readonly [string, string] | null;
  /** Lo que marca cada uno esta noche, en directo; nulo de día. */
  actions: readonly string[] | null;
  /** El anuncio en curso, si lo hay, con las causas reales. */
  deaths: readonly Death[];
  /** Las pociones que le quedan a la bruja, si hay bruja. */
  potions: string | null;
};

/** Los muertos lo ven todo, pero no pueden hablar del juego. */
export function SpectatorScreen({
  rows,
  lovers,
  actions,
  deaths,
  potions,
  ...chrome
}: SpectatorScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="dark" tilt="right">
        <Pill tone="lilac" caps onDark>
          {texts.pill}
        </Pill>
        <h1 className="font-display text-display-xs text-ground uppercase">{texts.title}</h1>
        <p className="text-base font-medium">{texts.text}</p>
      </Card>
      {deaths.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {deaths.map((death) => (
            <li key={death.user_id}>
              <DeathCard death={death} />
            </li>
          ))}
        </ul>
      ) : null}
      {actions ? (
        <section aria-labelledby="spectator-actions" className="flex flex-col gap-2">
          <h2 id="spectator-actions" className="font-display text-lg uppercase">
            {texts.actionsTitle}
          </h2>
          {actions.length === 0 ? (
            <p className="text-md font-medium">{texts.noActions}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {actions.map((line) => (
                <li key={line} className="text-md font-bold">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <section aria-labelledby="spectator-roles" className="flex flex-col gap-2">
        <h2 id="spectator-roles" className="font-display text-lg uppercase">
          {texts.rolesTitle}
        </h2>
        {lovers ? <p className="text-md font-bold">{texts.lovers(lovers[0], lovers[1])}</p> : null}
        {potions ? <p className="text-md font-bold">{potions}</p> : null}
        <RolesList rows={rows} />
      </section>
    </GameScreen>
  );
}
