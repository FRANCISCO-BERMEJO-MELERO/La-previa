import { Fragment } from 'react';
import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { copy } from '@/lib/copy';
import type { ParticipantView } from './game-view';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';

type TieScreenProps = GameScreenProps & {
  /** Empatados en cabeza; vacío si nadie votó. */
  tied: ParticipantView[];
};

/** 11: empate o votación sin votos. No se expulsa a nadie. */
export function TieScreen({ tied, ...chrome }: TieScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="hero" tilt="right" grow>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          {tied.length > 0 ? (
            <div aria-hidden="true" className="flex flex-wrap items-center justify-center gap-3">
              {tied.map((player, index) => (
                <Fragment key={player.userId}>
                  {index > 0 ? (
                    <span className="font-display text-3xl">{copy.tie.equals}</span>
                  ) : null}
                  <Avatar name={player.name} joinIndex={player.joinIndex} size="md" />
                </Fragment>
              ))}
            </div>
          ) : null}
          <h1 className="font-display text-display-md uppercase">{copy.tie.title}</h1>
          <p className="text-lead font-medium">
            {tied.length > 0 ? copy.tie.text(tied.map((player) => player.name)) : copy.tie.noVotes}
          </p>
        </div>
      </Card>
      <p className="text-base font-medium">{copy.tie.hint}</p>
    </GameScreen>
  );
}
