import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import type { RevealData } from './game-view';

type RevealScreenProps = GameScreenProps & {
  featuredText: string | null;
  reveal: RevealData;
};

/** Quién lo dijo, quién acertó y quién falló, y el resto de respuestas con su autor. */
export function RevealScreen({ featuredText, reveal, ...chrome }: RevealScreenProps) {
  const { author, correct, wrong, others } = reveal;
  const title = author ? author.name : copy.quienLoDijo.annulled;
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="right" tone={author ? 'lime' : 'paper'}>
        {author ? <Pill tone="lilac">{copy.quienLoDijo.saidBy}</Pill> : null}
        <h1 className={`font-display uppercase ${fitDisplay(title, 'text-display-sm')}`}>
          {title}
        </h1>
        {author && featuredText ? (
          <p className="font-display text-xl">{copy.quienLoDijo.quoted(featuredText)}</p>
        ) : (
          <p className="text-md font-medium">{copy.quienLoDijo.annulledText}</p>
        )}
      </Card>
      {author ? (
        <div className="flex flex-col gap-1">
          <p className="text-base font-bold">
            {correct.length > 0
              ? copy.quienLoDijo.correct(correct)
              : copy.quienLoDijo.nobodyCorrect}
          </p>
          {wrong.length > 0 ? (
            <p className="text-base font-medium">{copy.quienLoDijo.wrong(wrong)}</p>
          ) : null}
        </div>
      ) : null}
      {others.length > 0 ? (
        <>
          <h2 className="font-display text-lg uppercase">
            {author ? copy.quienLoDijo.otherAnswers : copy.quienLoDijo.answers}
          </h2>
          <ul className="flex flex-col gap-2.5">
            {others.map(({ player, text }) => (
              <li
                key={player.userId}
                className="flex items-center gap-3 rounded-chip border-3 border-ink bg-paper p-2.5"
              >
                <Avatar name={player.name} joinIndex={player.joinIndex} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold">{player.name}</span>
                  <span className="text-base font-medium wrap-break-word">{text}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </GameScreen>
  );
}
