import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Count } from '@/components/Count';
import { Pill } from '@/components/Pill';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import { delayClass, motionMs, sequenceDelays } from '@/lib/motion';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { VoteGroup, LunaPlayer } from './game-view';
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
        <p role="alert" className="animate-caer text-md font-bold">
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

type DayScreenProps = GameScreenProps & {
  day: number;
  mayor: string | null;
  /** El día en que se elige alcalde, cómo se votó. */
  mayorVotes: readonly VoteGroup[];
  /** La votación de alcalde acaba de cerrarse. */
  votesClosed?: boolean;
};

/** El debate: pantalla casi vacía para que el móvil se quede boca abajo. */
export function DayScreen({
  day,
  mayor,
  mayorVotes,
  votesClosed = false,
  ...chrome
}: DayScreenProps) {
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
      {mayorVotes.length > 0 ? (
        <section aria-labelledby="mayor-votes" className="flex flex-col gap-3">
          <h2 id="mayor-votes" className="font-display text-lg uppercase">
            {texts.day.mayorVotesTitle}
          </h2>
          <VoteGroupList groups={mayorVotes} highlightId={null} animate={votesClosed} />
        </section>
      ) : null}
    </GameScreen>
  );
}

type DefenseScreenProps = GameScreenProps & {
  /** Nombre del acusado; nulo si hubo empate o nadie votó. */
  accused: string | null;
  accusedId: string | null;
  isMe: boolean;
  groups: readonly VoteGroup[];
  /** La votación de acusación acaba de cerrarse. */
  votesClosed?: boolean;
};

/** La defensa: quién votó a quién, con el acusado destacado. */
export function DefenseScreen({
  accused,
  accusedId,
  isMe,
  groups,
  votesClosed = false,
  ...chrome
}: DefenseScreenProps) {
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
          <VoteGroupList groups={groups} highlightId={accusedId} animate={votesClosed} />
        )}
      </section>
    </GameScreen>
  );
}

/**
 * Quién votó a quién, agrupado por votado; el destacado, en `tomato`. Al cerrarse la votación,
 * cada fila cae, su recuento cuenta y, al final, la destacada salta (docs/PLAN-8.md §5 y §6).
 */
export function VoteGroupList({
  groups,
  highlightId,
  animate = false,
}: {
  groups: readonly VoteGroup[];
  highlightId: string | null;
  animate?: boolean;
}) {
  // Cada paso: la fila cae y su número cuenta; al final, el salto de la destacada.
  const delays = sequenceDelays(groups.length, motionMs.base + motionMs.contar + motionMs.base);
  const end = (delays.at(-1) ?? 0) + motionMs.base + motionMs.contar;
  return (
    <ul className="flex flex-col gap-2.5">
      {groups.map((group, index) => {
        const delay = delays[index] ?? 0;
        const highlighted = group.targetId === highlightId;
        return (
          <li key={group.targetId} className={animate ? `animate-caer ${delayClass(delay)}` : ''}>
            <div
              className={`flex flex-col gap-1 rounded-chip border-3 border-ink p-3 ${highlighted ? 'bg-tomato' : 'bg-paper'} ${animate && highlighted ? `animate-salto ${delayClass(end)}` : ''}`}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate font-display text-title uppercase">{group.name}</span>
                <span className="shrink-0 text-md font-bold">
                  <Count
                    value={group.weight}
                    from={animate ? 0 : null}
                    delay={delay + motionMs.base}
                    format={texts.defense.votes}
                  />
                </span>
              </span>
              <span className="text-sm font-medium">
                {copy.result.names(
                  group.voters.map((voter) =>
                    voter.double ? `${voter.name} ${texts.defense.double}` : voter.name,
                  ),
                )}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
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
