import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { DeathCard, type Death } from './DeathCard';

const texts = copy.lunaLlena;

type VerdictScreenProps = GameScreenProps & {
  accused: string;
  /** Lo que ya ha votado quien llama, si ha votado. */
  voted: boolean | null;
  onVote: (condemn: boolean) => void;
  busy: boolean;
  error?: string;
};

/** El veredicto: dos botones grandes, condenar o salvar. */
export function VerdictScreen({
  accused,
  voted,
  onVote,
  busy,
  error,
  ...chrome
}: VerdictScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <Pill tone="tomato" caps>
          {texts.verdict.pill}
        </Pill>
        <h1 className="font-display text-display-xs uppercase">{texts.verdict.title(accused)}</h1>
        <p className="text-base font-medium">{texts.verdict.hint}</p>
      </Card>
      {error ? (
        <p role="alert" className="text-md font-bold">
          {error}
        </p>
      ) : null}
      {voted === null ? (
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            disabled={busy}
            onClick={() => {
              onVote(true);
            }}
          >
            {texts.verdict.condemn}
          </Button>
          <Button
            variant="accent"
            fullWidth
            disabled={busy}
            onClick={() => {
              onVote(false);
            }}
          >
            {texts.verdict.spare}
          </Button>
        </div>
      ) : (
        <WaitingBox>{texts.verdict.voted(voted)}</WaitingBox>
      )}
    </GameScreen>
  );
}

/** El acusado no vota: espera el veredicto. */
export function AccusedScreen(chrome: GameScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="dark" tilt="right" grow>
        <Pill tone="tomato" caps onDark>
          {texts.verdict.pill}
        </Pill>
        <h1 className="flex flex-1 items-center font-display text-display-sm text-ground uppercase">
          {texts.verdict.accusedTitle}
        </h1>
        <p className="text-lead font-medium">{texts.verdict.accusedText}</p>
      </Card>
    </GameScreen>
  );
}

type ExecutionScreenProps = GameScreenProps & {
  deaths: readonly Death[];
  /** Nombre del acusado que se ha salvado, si se salvó. */
  spared: string | null;
  /** Quién votó condenar y quién salvar; nulo si el anuncio no es de un juicio. */
  sides: { condemn: string[]; spare: string[] } | null;
  /** El anuncio es de alguien que se ha ido de la sala. */
  left: boolean;
};

/** El resultado del juicio, o de un abandono: los votos, quién muere y su carta. */
export function ExecutionScreen({ deaths, spared, sides, left, ...chrome }: ExecutionScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <Pill tone="tomato" caps>
          {left ? texts.execution.left : texts.execution.pill}
        </Pill>
        {spared ? (
          <>
            <h1 className="font-display text-display-xs uppercase">
              {texts.execution.spared(spared)}
            </h1>
            <p className="text-lead font-medium">{texts.execution.sparedText}</p>
          </>
        ) : (
          <h1 className="font-display text-display-xs uppercase">
            {left ? texts.execution.left : texts.execution.hanged}
          </h1>
        )}
        {deaths.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {deaths.map((death) => (
              <li key={death.user_id}>
                <DeathCard death={death} />
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
      {sides ? (
        <div className="grid grid-cols-2 gap-3">
          <VoteSide title={texts.execution.condemnVotes} names={sides.condemn} />
          <VoteSide title={texts.execution.spareVotes} names={sides.spare} />
        </div>
      ) : null}
    </GameScreen>
  );
}

function VoteSide({ title, names }: { title: string; names: readonly string[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5 rounded-chip border-3 border-ink bg-paper p-3">
      <h2 className="font-display text-lg uppercase">{title}</h2>
      {names.length === 0 ? (
        <p className="text-sm font-medium">{texts.execution.nobody}</p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {names.map((name) => (
            <li key={name} className="truncate text-md font-bold">
              {name}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
