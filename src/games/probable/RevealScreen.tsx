import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { TallyRow } from './game-view';

type RevealScreenProps = GameScreenProps & {
  prompt: string;
  /** De más a menos votos; solo quien ha recibido alguno. */
  tally: TallyRow[];
};

/** Recuento público de la ronda: quién se lleva el punto y quién votó a quién. */
export function RevealScreen({ prompt, tally, ...chrome }: RevealScreenProps) {
  const winners = tally.filter((row) => row.winner).map((row) => row.player.name);
  const title = winners.length > 0 ? copy.rounds.names(winners) : copy.probable.noVotes;
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="right" tone={winners.length > 0 ? 'lime' : 'paper'}>
        <Pill tone="sky" caps>
          {winners.length > 0 ? copy.probable.roundWinner(winners.length) : copy.probable.question}
        </Pill>
        <h1 className={`font-display uppercase ${fitDisplay(title, 'text-display-sm')}`}>
          {title}
        </h1>
        <p className="text-md font-medium">
          {winners.length > 0 ? copy.probable.prompt(prompt) : copy.probable.noVotesText}
        </p>
      </Card>
      <ol className="flex flex-col gap-3">
        {tally.map((row) => (
          <li
            key={row.player.userId}
            className={`flex items-center gap-3 rounded-chip border-3 border-ink p-2.5 ${row.winner ? 'bg-lime' : 'bg-paper'}`}
          >
            <Avatar
              name={row.player.name}
              joinIndex={row.player.joinIndex}
              avatar={row.player.avatar}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base font-bold">{row.player.name}</span>
              <span className="text-xs font-medium">
                {copy.probable.votesFrom(row.votes, row.voters)}
              </span>
            </div>
            {row.winner ? (
              <span className="shrink-0 rounded-full border-3 border-ink bg-paper px-2 font-display text-base">
                {copy.probable.point}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </GameScreen>
  );
}
