import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { AFTER_ENTRY_MS, delayClass, motionMs } from '@/lib/motion';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { DeathCard, type Death } from './DeathCard';
import { fallDelays } from './fall';

type DawnScreenProps = GameScreenProps & {
  deaths: readonly Death[];
  /**
   * Avisos privados: a quién amas o a quién has enamorado, la primera noche, y qué han hecho
   * tus pociones, si eres la bruja. Nunca se animan.
   */
  secrets: readonly string[];
  /** Al amanecer cae el titular y, si no hay muertos, la fila de la noche tranquila. */
  animate?: boolean;
  /** Muertos que caen de uno en uno, en orden: los de la noche o la víctima del cazador. */
  fallen?: readonly string[];
};

/** El amanecer: quién ha muerto y qué era, o que la noche ha sido tranquila. */
export function DawnScreen({
  deaths,
  secrets,
  animate = false,
  fallen = [],
  ...chrome
}: DawnScreenProps) {
  const texts = copy.lunaLlena.dawn;
  const title = animate ? `animate-caer ${delayClass(AFTER_ENTRY_MS)}` : '';
  const delays = fallDelays(fallen, AFTER_ENTRY_MS + (animate ? motionMs.base : 0));
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <div className={`flex flex-col gap-4 ${title}`}>
          <Pill tone="orange" caps>
            {texts.pill}
          </Pill>
          <h1
            className={`font-display uppercase ${deaths.length === 0 ? 'text-display-sm' : 'text-display-xs'}`}
          >
            {deaths.length === 0 ? texts.quietTitle : texts.deathsTitle}
          </h1>
        </div>
        {deaths.length === 0 ? (
          <p
            className={`tilt-pill-left self-start rounded-control border-3 border-ink bg-lime px-3 py-2 text-lead font-bold ${animate ? `animate-caer ${delayClass(AFTER_ENTRY_MS + motionMs.base)}` : ''}`}
          >
            {texts.quietText}
          </p>
        ) : (
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
                    stamp={texts.deadStamp}
                    stampDelay={delay === undefined ? null : delay + motionMs.base}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {secrets.map((secret) => (
        <p
          key={secret}
          className="rounded-chip border-3 border-ink bg-field-error p-3.5 text-base font-bold"
        >
          {secret}
        </p>
      ))}
    </GameScreen>
  );
}
