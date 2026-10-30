import { Card } from '@/components/Card';
import { Count } from '@/components/Count';
import { PlayerChip } from '@/components/PlayerChip';
import { copy } from '@/lib/copy';
import { delayClass, motionMs, sequenceDelays } from '@/lib/motion';
import type { ParticipantView } from './game-view';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { KickableChip } from '@/screens/KickableChip';

type VoteWaitScreenProps = GameScreenProps & {
  /** Vivos que votan; solo se sabe si han votado, nunca a quién. */
  voters: ParticipantView[];
  /** A quién ha votado quien mira, si participa y ha votado. */
  myVote: string | null;
  /** Texto para el anfitrión encima del botón de cerrar. */
  hint?: string;
  busy: boolean;
  /** Solo para el anfitrión: echar a un desconectado a media partida. */
  onKickRequest?: (userId: string) => void;
  /** Quienes acaban de votar: su ficha cae, de uno en uno. */
  justVoted?: readonly string[];
  /** Cuántos habían votado en la foto anterior, para contar desde ahí. */
  votedBefore?: number | null;
};

/** 09: esperando votos. Se ve quién ha votado, nunca a quién ni el recuento. */
export function VoteWaitScreen({
  voters,
  myVote,
  hint,
  busy,
  onKickRequest,
  justVoted = [],
  votedBefore = null,
  footer,
  ...chrome
}: VoteWaitScreenProps) {
  const voted = voters.filter((voter) => voter.hasVoted).length;
  const delays = sequenceDelays(justVoted.length, motionMs.base);
  const fall = (userId: string) => {
    const step = justVoted.indexOf(userId);
    return step === -1 ? '' : `animate-caer ${delayClass(delays[step] ?? 0)}`;
  };
  return (
    <GameScreen
      {...chrome}
      footer={
        <>
          {hint ? <p className="text-md font-medium">{hint}</p> : null}
          {footer}
        </>
      }
    >
      <Card>
        <h1 className="text-label font-bold uppercase tracking-label">{copy.vote.received}</h1>
        <p className="font-display text-7xl">
          <Count
            value={voted}
            from={votedBefore}
            format={(count) => copy.vote.count(count, voters.length)}
          />
        </p>
        <div className="flex gap-1.5" aria-hidden="true">
          {voters.map((voter, index) => (
            <span
              key={voter.userId}
              className={`h-4 flex-1 rounded-full border-3 border-ink ${index < voted ? 'bg-lime' : 'bg-paper'}`}
            />
          ))}
        </div>
      </Card>
      {myVote ? <p className="text-base font-bold">{copy.vote.mine(myVote)}</p> : null}
      <ul className="grid grid-cols-2 gap-3">
        {voters.map((voter) => {
          const chip = (
            <PlayerChip
              name={voter.name}
              muted={!voter.hasVoted}
              detail={
                voter.hasVoted
                  ? copy.vote.voted
                  : voter.connected
                    ? copy.vote.thinking
                    : copy.lobby.disconnected
              }
            />
          );
          return (
            <li key={voter.userId} className={`min-w-0 ${fall(voter.userId)}`}>
              {onKickRequest && !voter.connected ? (
                <KickableChip
                  name={voter.name}
                  disabled={busy}
                  onKickRequest={() => {
                    onKickRequest(voter.userId);
                  }}
                >
                  {chip}
                </KickableChip>
              ) : (
                chip
              )}
            </li>
          );
        })}
      </ul>
    </GameScreen>
  );
}
