import { Card } from '@/components/Card';
import { PlayerChip } from '@/components/PlayerChip';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { KickableChip } from '@/screens/KickableChip';
import type { Player } from './game-view';

type VoteWaitScreenProps = GameScreenProps & {
  prompt: string;
  /** Activos que votan; solo se sabe si han votado, nunca a quién. */
  voters: Player[];
  /** A quién ha votado quien mira. */
  myVote: string | null;
  /** Texto para el anfitrión encima del botón de cerrar. */
  hint?: string;
  busy: boolean;
  /** Solo para el anfitrión: echar a un desconectado a media partida. */
  onKickRequest?: (userId: string) => void;
};

/** Esperando votos: cuántos faltan y quiénes, nunca a quién han votado. */
export function VoteWaitScreen({
  prompt,
  voters,
  myVote,
  hint,
  busy,
  onKickRequest,
  footer,
  ...chrome
}: VoteWaitScreenProps) {
  const voted = voters.filter((voter) => voter.hasResponded).length;
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
        <h1 className="text-label font-bold uppercase tracking-label">{copy.probable.voted}</h1>
        <p className="font-display text-7xl">{copy.vote.count(voted, voters.length)}</p>
        <div className="flex gap-1.5" aria-hidden="true">
          {voters.map((voter, index) => (
            <span
              key={voter.userId}
              className={`h-4 flex-1 rounded-full border-3 border-ink ${index < voted ? 'bg-lime' : 'bg-paper'}`}
            />
          ))}
        </div>
      </Card>
      <p className="text-md font-medium">{copy.probable.prompt(prompt)}</p>
      {myVote ? <p className="text-base font-bold">{copy.vote.mine(myVote)}</p> : null}
      <ul className="grid grid-cols-2 gap-3">
        {voters.map((voter) => {
          const chip = (
            <PlayerChip
              name={voter.name}
              muted={!voter.hasResponded}
              detail={
                voter.hasResponded
                  ? copy.vote.voted
                  : voter.connected
                    ? copy.vote.thinking
                    : copy.lobby.disconnected
              }
            />
          );
          return (
            <li key={voter.userId} className="min-w-0">
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
