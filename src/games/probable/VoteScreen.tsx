import { Button } from '@/components/Button';
import { CandidateList } from '@/games/rounds/CandidateList';
import type { Player } from '@/games/rounds/game-view';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { PromptCard } from './PromptCard';

type VoteScreenProps = Omit<GameScreenProps, 'footer'> & {
  prompt: string;
  /** Todos los activos, también quien vota: puede votarse a sí mismo. */
  candidates: Player[];
  selected: string | null;
  busy: boolean;
  error?: string;
  onSelect: (userId: string) => void;
  onVote: () => void;
};

/** Pregunta y lista para votar. El voto no se cambia una vez enviado. */
export function VoteScreen({
  prompt,
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
      <PromptCard prompt={prompt} />
      <CandidateList candidates={candidates} selected={selected} onSelect={onSelect} />
      {error ? (
        <p role="alert" className="text-md font-bold">
          {error}
        </p>
      ) : null}
      <p className="text-md font-medium">{copy.probable.voteHint}</p>
    </GameScreen>
  );
}
