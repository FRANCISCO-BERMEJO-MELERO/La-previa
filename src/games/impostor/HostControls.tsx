import { Button } from '@/components/Button';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import type { Phase } from '@/lib/snapshot';

type HostControlsProps = {
  phase: Phase;
  isHost: boolean;
  hostName: string;
  /** En la revelación: si al continuar se acaba la partida. */
  gameOver: boolean;
  busy: boolean;
  error?: string;
  onOpenVoting: () => void;
  onCloseVoting: () => void;
  onContinue: () => void;
  onPlayAgain: () => void;
  onChangeGame: () => void;
};

/**
 * Pie de las pantallas de partida: el botón que avanza la fase para el anfitrión
 * y, para los demás, la caja de espera que dice quién decide (docs/CONTEXTO.md §6).
 */
export function HostControls({
  phase,
  isHost,
  hostName,
  gameOver,
  busy,
  error,
  onOpenVoting,
  onCloseVoting,
  onContinue,
  onPlayAgain,
  onChangeGame,
}: HostControlsProps) {
  const alert = error ? (
    <p role="alert" className="animate-caer text-md font-bold">
      {error}
    </p>
  ) : null;

  if (!isHost) return <WaitingBox>{waitingText(phase, hostName)}</WaitingBox>;

  switch (phase) {
    case 'talking':
      return (
        <>
          {alert}
          <Button fullWidth disabled={busy} onClick={onOpenVoting}>
            {copy.deal.openVoting}
          </Button>
        </>
      );
    case 'voting':
      return (
        <>
          {alert}
          <Button fullWidth disabled={busy} onClick={onCloseVoting}>
            {copy.vote.close}
          </Button>
        </>
      );
    case 'reveal':
      return (
        <>
          {alert}
          <Button fullWidth disabled={busy} onClick={onContinue}>
            {gameOver ? copy.reveal.seeResult : copy.reveal.nextRound}
          </Button>
        </>
      );
    case 'finished':
      return (
        <>
          {alert}
          <Button variant="accent" fullWidth disabled={busy} onClick={onChangeGame}>
            {copy.result.changeGame}
          </Button>
          <Button fullWidth disabled={busy} onClick={onPlayAgain}>
            {copy.result.playAgain}
          </Button>
        </>
      );
  }
}

function waitingText(phase: Phase, hostName: string): string {
  switch (phase) {
    case 'talking':
      return copy.deal.waitingVote(hostName);
    case 'voting':
      return copy.vote.waitingClose(hostName);
    case 'reveal':
      return copy.reveal.waitingHost(hostName);
    case 'finished':
      return copy.result.waitingHost(hostName);
  }
}
