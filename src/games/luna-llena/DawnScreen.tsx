import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { DeathCard, type Death } from './DeathCard';

type DawnScreenProps = GameScreenProps & {
  deaths: readonly Death[];
  /** Aviso privado de la primera noche: a quién amas o a quién has enamorado. */
  secret: string | null;
};

/** El amanecer: quién ha muerto y qué era, o que la noche ha sido tranquila. */
export function DawnScreen({ deaths, secret, ...chrome }: DawnScreenProps) {
  const texts = copy.lunaLlena.dawn;
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <Pill tone="orange" caps>
          {texts.pill}
        </Pill>
        {deaths.length === 0 ? (
          <>
            <h1 className="font-display text-display-sm uppercase">{texts.quietTitle}</h1>
            <p className="text-lead font-medium">{texts.quietText}</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-display-xs uppercase">{texts.deathsTitle}</h1>
            <ul className="flex flex-col gap-3">
              {deaths.map((death) => (
                <li key={death.user_id}>
                  <DeathCard death={death} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      {secret ? (
        <p className="rounded-chip border-3 border-ink bg-field-error p-3.5 text-base font-bold">
          {secret}
        </p>
      ) : null}
    </GameScreen>
  );
}
