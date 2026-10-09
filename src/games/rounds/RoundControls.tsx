import { Button } from '@/components/Button';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';

type RoundControlsProps = {
  isHost: boolean;
  /** Para los demás: a quién o qué esperan. */
  waiting: string;
  /** Al terminar: volver a jugar o cambiar de juego. Si no, el botón que avanza la fase. */
  finished: boolean;
  advanceLabel: string;
  busy: boolean;
  error?: string;
  onAdvance: () => void;
  onPlayAgain: () => void;
  onChangeGame: () => void;
};

/** Pie de las pantallas de un juego por rondas: el botón del anfitrión o la caja de espera. */
export function RoundControls({
  isHost,
  waiting,
  finished,
  advanceLabel,
  busy,
  error,
  onAdvance,
  onPlayAgain,
  onChangeGame,
}: RoundControlsProps) {
  if (!isHost) return <WaitingBox>{waiting}</WaitingBox>;

  const alert = error ? (
    <p role="alert" className="text-md font-bold">
      {error}
    </p>
  ) : null;

  if (finished) {
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

  return (
    <>
      {alert}
      <Button fullWidth disabled={busy} onClick={onAdvance}>
        {advanceLabel}
      </Button>
    </>
  );
}
