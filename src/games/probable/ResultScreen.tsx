import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { Player, RankingRow } from './game-view';

type ResultScreenProps = GameScreenProps & {
  /** Los de más puntos; vacío si nadie ha puntuado. */
  leaders: Player[];
  ranking: RankingRow[];
};

/** Final: el más probable de la noche y la clasificación por puntos. */
export function ResultScreen({ leaders, ranking, ...chrome }: ResultScreenProps) {
  const title =
    leaders.length > 0
      ? copy.probable.names(leaders.map((leader) => leader.name))
      : copy.probable.noWinner;
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="left" tone={leaders.length > 0 ? 'lime' : 'paper'}>
        <Pill tone="sky">{copy.probable.resultPill}</Pill>
        <h1 className={`font-display uppercase ${fitDisplay(title, 'text-display-sm')}`}>
          {title}
        </h1>
      </Card>
      <h2 className="font-display text-lg uppercase">{copy.rounds.ranking}</h2>
      <ol className="flex flex-col gap-2.5">
        {ranking.map((row) => (
          <li
            key={row.player.userId}
            className={`flex items-center gap-3 rounded-chip border-3 border-ink p-2.5 ${row.player.active ? 'bg-paper' : 'border-dashed bg-ground-soft'}`}
          >
            <span className="w-8 shrink-0 font-display text-lg">
              {copy.rounds.position(row.position)}
            </span>
            <Avatar name={row.player.name} joinIndex={row.player.joinIndex} />
            <span className="min-w-0 flex-1 truncate text-base font-bold">{row.player.name}</span>
            <span className="shrink-0 text-sm font-bold">{copy.rounds.points(row.score)}</span>
          </li>
        ))}
      </ol>
    </GameScreen>
  );
}
