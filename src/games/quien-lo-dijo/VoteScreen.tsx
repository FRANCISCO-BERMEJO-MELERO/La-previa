import { Button } from '@/components/Button';
import { CandidateList } from '@/games/rounds/CandidateList';
import type { Player } from '@/games/rounds/game-view';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { FeaturedCard } from './cards';

type VoteScreenProps = Omit<GameScreenProps, 'footer'> & {
  featuredText: string;
  /** Activos menos quien vota: nadie se vota a sí mismo. */
  candidates: Player[];
  selected: string | null;
  busy: boolean;
  error?: string;
  onSelect: (userId: string) => void;
  onVote: () => void;
};

/** Respuesta anónima y lista para votar quién la escribió. */
export function VoteScreen({
  featuredText,
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
      <FeaturedCard text={featuredText} label={copy.quienLoDijo.question} heading />
      <CandidateList candidates={candidates} selected={selected} onSelect={onSelect} />
      {error ? (
        <p role="alert" className="animate-caer text-md font-bold">
          {error}
        </p>
      ) : null}
      <p className="text-md font-medium">{copy.quienLoDijo.voteHint}</p>
    </GameScreen>
  );
}
