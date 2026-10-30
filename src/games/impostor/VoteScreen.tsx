import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { copy } from '@/lib/copy';
import type { ParticipantView } from './game-view';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';

type VoteScreenProps = Omit<GameScreenProps, 'footer'> & {
  myName: string;
  candidates: ParticipantView[];
  selected: string | null;
  busy: boolean;
  error?: string;
  onSelect: (userId: string) => void;
  onVote: () => void;
};

/** 08: elegir a quién votar. El voto no se puede cambiar una vez enviado. */
export function VoteScreen({
  myName,
  candidates,
  selected,
  busy,
  error,
  onSelect,
  onVote,
  ...chrome
}: VoteScreenProps) {
  const target = candidates.find((candidate) => candidate.userId === selected);
  return (
    <GameScreen
      {...chrome}
      footer={
        <Button fullWidth disabled={busy || !target} onClick={onVote}>
          {target ? copy.vote.submit(target.name) : copy.vote.choose}
        </Button>
      }
    >
      <h1 className="font-display text-display-sm uppercase">{copy.vote.title}</h1>
      <ul className="flex flex-col gap-3">
        {candidates.map((candidate) => {
          const pressed = candidate.userId === selected;
          const look = pressed
            ? 'bg-ink text-paper shadow-hard-tomato'
            : candidate.connected
              ? 'bg-paper'
              : 'border-dashed bg-ground-soft';
          return (
            <li key={candidate.userId}>
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => {
                  onSelect(candidate.userId);
                }}
                className={`flex h-15 w-full items-center gap-3 rounded-chip border-3 border-ink px-3 text-left text-lg font-bold ${look}`}
              >
                <Avatar
                  name={candidate.name}
                  joinIndex={candidate.joinIndex}
                  avatar={candidate.avatar}
                  muted={!candidate.connected}
                  onDark={pressed}
                />
                <span className="min-w-0 flex-1 truncate">{candidate.name}</span>
                {pressed ? (
                  <span className="rounded-full bg-ground px-2.5 py-1 text-label text-ink">
                    {copy.vote.yourVote}
                  </span>
                ) : candidate.connected ? null : (
                  <span className="text-label font-medium">{copy.lobby.disconnected}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="animate-caer text-md font-bold">
          {error}
        </p>
      ) : null}
      <p className="text-md font-medium">{copy.vote.hint(myName)}</p>
    </GameScreen>
  );
}
