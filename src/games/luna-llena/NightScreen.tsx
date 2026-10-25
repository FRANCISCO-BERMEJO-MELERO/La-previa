import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { LunaPlayer, NightMode } from './game-view';
import { PlayerList } from './PlayerList';

/** La poción de vida de la bruja: si le queda, y si la ha marcado para esta noche. */
type LifePotion = { available: boolean; active: boolean; onToggle: () => void };

type NightScreenProps = GameScreenProps & {
  night: number;
  mode: NightMode;
  candidates: readonly LunaPlayer[];
  selected: readonly string[];
  /** Si ya se puede confirmar lo elegido. */
  ready: boolean;
  onToggle: (userId: string) => void;
  onConfirm: () => void;
  busy: boolean;
  error?: string;
  /** Lo que ya ha hecho esta noche, en una frase; nulo si aún no ha actuado. */
  done: string | null;
  /** Una nota bajo algunos jugadores: a quién marca la manada. */
  marks: ReadonlyMap<string, string>;
  /** Lo que ha visto la vidente, noche a noche. */
  seerResults: readonly string[];
  /** Solo para la bruja: a quién van a devorar y su poción de vida. */
  victimLine?: string | null;
  lifePotion?: LifePotion | null;
  pending: number;
};

/**
 * La noche: todos los vivos tocan el móvil y todas las pantallas se parecen, para que nadie
 * deduzca un rol mirando de reojo. Los lobos pueden cambiar su marca hasta el amanecer.
 */
export function NightScreen({
  night,
  mode,
  candidates,
  selected,
  ready,
  onToggle,
  onConfirm,
  busy,
  error,
  done,
  marks,
  seerResults,
  victimLine = null,
  lifePotion = null,
  pending,
  ...chrome
}: NightScreenProps) {
  const texts = copy.lunaLlena.night;
  const choosing = done === null || mode === 'wolf';
  const witch = mode === 'witch';
  return (
    <GameScreen {...chrome}>
      <Card variant="dark" tilt="right">
        <Pill tone="sky" caps onDark>
          {texts.pill(night)}
        </Pill>
        <h1 className="font-display text-display-xs text-ground uppercase">{texts.titles[mode]}</h1>
        <p className="text-base font-medium">{texts.hints[mode]}</p>
        {victimLine ? <p className="font-display text-lg uppercase">{victimLine}</p> : null}
        {done ? <p className="font-display text-lg uppercase">{done}</p> : null}
        {choosing && lifePotion ? (
          <button
            type="button"
            aria-pressed={lifePotion.active}
            disabled={!lifePotion.available}
            onClick={lifePotion.onToggle}
            className={`min-h-12 rounded-control border-3 border-paper px-3 py-2 text-md font-bold disabled:cursor-not-allowed disabled:border-dashed ${
              lifePotion.active ? 'bg-lime text-ink' : 'bg-ink text-paper'
            }`}
          >
            {lifePotion.available ? texts.witch.life : texts.witch.lifeUsed}
          </button>
        ) : null}
        {choosing && witch ? (
          <p className="text-md font-bold">
            {candidates.length > 0 ? texts.witch.poisonTitle : texts.witch.poisonUsed}
          </p>
        ) : null}
        {choosing && candidates.length > 0 ? (
          <PlayerList
            label={texts.choose}
            players={candidates}
            selected={selected}
            onToggle={onToggle}
            notes={marks}
            onDark
          />
        ) : null}
      </Card>
      {seerResults.length > 0 ? (
        <section aria-labelledby="seer-title" className="flex flex-col gap-2">
          <h2 id="seer-title" className="font-display text-lg uppercase">
            {texts.seerTitle}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {seerResults.map((line) => (
              <li key={line} className="text-md font-bold">
                {line}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {error ? (
        <p role="alert" className="text-md font-bold">
          {error}
        </p>
      ) : null}
      {choosing ? (
        <Button fullWidth disabled={busy || !ready} onClick={onConfirm}>
          {done === null ? texts.confirm : texts.changeMark}
        </Button>
      ) : (
        <WaitingBox>{texts.waiting}</WaitingBox>
      )}
      <p className="text-md font-bold">{texts.pending(pending)}</p>
    </GameScreen>
  );
}
