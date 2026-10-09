import { Avatar } from '@/components/Avatar';
import { copy } from '@/lib/copy';
import type { Player } from './game-view';

type CandidateListProps = {
  candidates: Player[];
  selected: string | null;
  onSelect: (userId: string) => void;
};

/** Lista de jugadores para votar; el elegido queda marcado hasta que se envía el voto. */
export function CandidateList({ candidates, selected, onSelect }: CandidateListProps) {
  return (
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
  );
}
