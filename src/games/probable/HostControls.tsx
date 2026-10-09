import { Button } from '@/components/Button';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import type { ProbableGameState } from '@/lib/snapshot';

type HostControlsProps = {
  phase: ProbableGameState['phase'];
  isHost: boolean;
  hostName: string;
  /** En la revelación: si es la última ronda y al seguir se acaba la partida. */
  lastRound: boolean;
  busy: boolean;
  error?: string;
  onClose: () => void;
  onNext: () => void;
  onPlayAgain: () => void;
  onChangeGame: () => void;
};

/** Pie de las pantallas: el botón que avanza para el anfitrión y la espera para los demás. */
export function HostControls({
  phase,
  isHost,
  hostName,
  lastRound,
  busy,
  error,
  onClose,
  onNext,
  onPlayAgain,
  onChangeGame,
}: HostControlsProps) {
  const alert = error ? (
    <p role="alert" className="text-md font-bold">
      {error}
    </p>
  ) : null;

  if (!isHost) return <WaitingBox>{waitingText(phase, hostName)}</WaitingBox>;

  switch (phase) {
    case 'voting':
      return (
        <>
          {alert}
          <Button fullWidth disabled={busy} onClick={onClose}>
            {copy.vote.close}
          </Button>
        </>
      );
    case 'reveal':
      return (
        <>
          {alert}
          <Button fullWidth disabled={busy} onClick={onNext}>
            {lastRound ? copy.reveal.seeResult : copy.probable.next}
          </Button>
        </>
      );
    case 'finished':
      return (
        <>
          {alert}
          <Button variant="secondary" fullWidth disabled={busy} onClick={onChangeGame}>
            {copy.result.changeGame}
          </Button>
          <Button fullWidth disabled={busy} onClick={onPlayAgain}>
            {copy.result.playAgain}
          </Button>
        </>
      );
  }
}

function waitingText(phase: ProbableGameState['phase'], hostName: string): string {
  switch (phase) {
    case 'voting':
      return copy.vote.waitingClose(hostName);
    case 'reveal':
      return copy.reveal.waitingHost(hostName);
    case 'finished':
      return copy.result.waitingHost(hostName);
  }
}
