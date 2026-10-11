import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { AccuseGroup, LunaPlayer } from './game-view';
import { PlayerList } from './PlayerList';

const texts = copy.lunaLlena;

type VoteScreenProps = GameScreenProps & {
  pill: string;
  title: string;
  hint: string;
  candidates: readonly LunaPlayer[];
  mayorId: string | null;
  selected: string | null;
  onSelect: (userId: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error?: string;
  /** A quién ha votado ya quien llama; mientras se vota no se ve nada más. */
  voted: string | null;
  pending: number;
};

/** Votar alcalde o a quién se acusa; tras votar, solo se ve cuántos faltan. */
export function VoteScreen({
  pill,
  title,
  hint,
  candidates,
  mayorId,
  selected,
  onSelect,
  onSubmit,
  busy,
  error,
  voted,
  pending,
  ...chrome
}: VoteScreenProps) {
  const chosen = candidates.find((player) => player.userId === selected);
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <Pill tone="sky" caps>
          {pill}
        </Pill>
        <h1 className="font-display text-display-xs uppercase">{title}</h1>
        <p className="text-base font-medium">{hint}</p>
        {voted === null ? (
          <PlayerList
            label={texts.vote.choose}
            players={candidates}
            selected={selected ? [selected] : []}
            onToggle={onSelect}
            mayorId={mayorId}
          />
        ) : (
          <p className="font-display text-lg uppercase">{texts.vote.voted(voted)}</p>
        )}
      </Card>
      {error ? (
        <p role="alert" className="text-md font-bold">
          {error}
        </p>
      ) : null}
      {voted === null ? (
        <Button fullWidth disabled={busy || !chosen} onClick={onSubmit}>
          {chosen ? texts.vote.submit(chosen.name) : texts.vote.choosePlayer}
        </Button>
      ) : null}
      <p className="text-md font-bold">{texts.vote.pending(pending)}</p>
    </GameScreen>
  );
}

type DayScreenProps = GameScreenProps & { day: number; mayor: string | null };

/** El debate: pantalla casi vacía para que el móvil se quede boca abajo. */
export function DayScreen({ day, mayor, ...chrome }: DayScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="dark" tilt="right" grow>
        <Pill tone="orange" caps onDark>
          {texts.day.pill(day)}
        </Pill>
        <h1 className="flex flex-1 items-center font-display text-display-md text-ground uppercase">
          {texts.day.title}
        </h1>
        <p className="text-lead font-medium">{texts.day.text}</p>
        <p className="border-t-3 border-paper pt-3 text-base font-bold">
          {mayor ? texts.day.mayor(mayor) : texts.day.noMayor}
        </p>
      </Card>
    </GameScreen>
  );
}

type DefenseScreenProps = GameScreenProps & {
  /** Nombre del acusado; nulo si hubo empate o nadie votó. */
  accused: string | null;
  accusedId: string | null;
  isMe: boolean;
  groups: readonly AccuseGroup[];
};

/** La defensa: quién votó a quién, con el acusado destacado. */
export function DefenseScreen({ accused, accusedId, isMe, groups, ...chrome }: DefenseScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left">
        <Pill tone="tomato" caps>
          {texts.defense.pill}
        </Pill>
        <h1 className="font-display text-display-xs uppercase">
          {accused ? texts.defense.accused(accused) : texts.defense.noAccused}
        </h1>
        <p className="text-base font-medium">
          {accused
            ? isMe
              ? texts.defense.youSpeak
              : texts.defense.speak(accused)
            : texts.defense.noAccusedText}
        </p>
      </Card>
      <section aria-labelledby="defense-votes" className="flex flex-col gap-3">
        <h2 id="defense-votes" className="font-display text-lg uppercase">
          {texts.defense.votesTitle}
        </h2>
        {groups.length === 0 ? (
          <p className="text-md font-bold">{texts.defense.noVotes}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {groups.map((group) => {
              const highlighted = group.targetId === accusedId;
              return (
                <li
                  key={group.targetId}
                  className={`flex flex-col gap-1 rounded-chip border-3 border-ink p-3 ${highlighted ? 'bg-tomato' : 'bg-paper'}`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-display text-title uppercase">{group.name}</span>
                    <span className="shrink-0 text-md font-bold">
                      {texts.defense.votes(group.weight)}
                    </span>
                  </span>
                  <span className="text-sm font-medium">
                    {copy.result.names(
                      group.voters.map((voter) =>
                        voter.double ? `${voter.name} ${texts.defense.double}` : voter.name,
                      ),
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </GameScreen>
  );
}

/** Espera sencilla con el texto que toque. */
export function WaitScreen({ text, ...chrome }: GameScreenProps & { text: string }) {
  return (
    <GameScreen {...chrome}>
      <WaitingBox>{text}</WaitingBox>
    </GameScreen>
  );
}
