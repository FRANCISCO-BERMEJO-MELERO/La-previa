'use client';

import type { PillButtonTone } from '@/components/PillButton';
import { useState, type ReactNode } from 'react';
import { WaitingBox } from '@/components/WaitingBox';
import {
  activePlayers,
  hostName,
  isLastRound,
  leaders,
  rankingRows,
} from '@/games/rounds/game-view';
import { restartOrLobby } from '@/games/rounds/restart';
import { ResultScreen } from '@/games/rounds/ResultScreen';
import { RoundControls } from '@/games/rounds/RoundControls';
import {
  palabrasProhibidasForbidden,
  palabrasProhibidasGuessed,
  palabrasProhibidasNext,
  palabrasProhibidasPass,
  palabrasProhibidasStart,
  type ActionResult,
} from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { PalabrasProhibidasGameState, Snapshot } from '@/lib/snapshot';
import { LateScreen } from '@/screens/LateScreen';
import { guessers, nameOf } from './game-view';
import { DescribeScreen, GuessScreen, RevealScreen, WatchScreen } from './screens';
import { viewFor } from './view';

type PalabrasProhibidasGameProps = {
  snapshot: Snapshot;
  game: PalabrasProhibidasGameState;
  /** Píldora de la cabecera que abre el diálogo de salir. */
  pill: (label: string, tone?: PillButtonTone) => ReactNode;
  notice: ReactNode;
  busy: boolean;
  error?: string;
  /** Ejecuta una acción y aplica la foto que devuelve; resuelve si ha ido bien. */
  run: (action: () => Promise<ActionResult<Snapshot>>) => Promise<boolean>;
  onChangeGame: () => void;
};

/** Partida de Palabras prohibidas: acciones del juego y pantalla según la foto. */
export function PalabrasProhibidasGame({
  snapshot,
  game,
  pill,
  notice,
  busy,
  error,
  run,
  onChangeGame,
}: PalabrasProhibidasGameProps) {
  const [guesser, setGuesser] = useState<string | null>(null);
  const roomId = snapshot.room.id;
  const myId = snapshot.me.user_id;
  const isHost = snapshot.me.is_host;
  const host = hostName(snapshot);
  const describer = nameOf(snapshot, game, game.describer_id);
  const watcher = nameOf(snapshot, game, game.watcher_id);
  const card = { word: game.word ?? '', forbidden: game.forbidden ?? [] };
  const roundPill = pill(copy.rounds.pill(game.round, game.total_rounds), 'tomato');
  // Mientras se describe, la ronda la cierran quien describe o quien vigila; el anfitrión, el resto.
  const waitingMark = <WaitingBox>{copy.palabrasProhibidas.waitingMark(describer)}</WaitingBox>;
  const controls = (
    <RoundControls
      inCharge={isHost}
      waiting={
        game.phase === 'reveal' ? copy.reveal.waitingHost(host) : copy.result.waitingHost(host)
      }
      finished={game.phase === 'finished'}
      advanceLabel={isLastRound(game) ? copy.reveal.seeResult : copy.rounds.next}
      busy={busy}
      error={error}
      onAdvance={() => {
        void run(() => palabrasProhibidasNext(roomId));
      }}
      onPlayAgain={() => {
        void run(() =>
          restartOrLobby(roomId, () => palabrasProhibidasStart(roomId, game.total_rounds)),
        );
      }}
      onChangeGame={onChangeGame}
    />
  );

  switch (viewFor(game, myId)) {
    case 'late':
      return (
        <LateScreen
          aside={roundPill}
          notice={notice}
          footer={
            isHost && game.phase === 'reveal' ? (
              controls
            ) : (
              <WaitingBox>{copy.late.waitingRound}</WaitingBox>
            )
          }
          text={copy.late.textRound}
          myName={snapshot.me.name}
          playing={activePlayers(snapshot, game).map((player) => ({
            ...player,
            muted: !player.connected,
          }))}
        />
      );
    case 'describe':
      return (
        <DescribeScreen
          aside={roundPill}
          notice={notice}
          {...card}
          candidates={guessers(snapshot, game)}
          selected={guesser}
          busy={busy}
          error={error}
          onSelect={setGuesser}
          onGuessed={() => {
            if (!guesser) return;
            void run(() => palabrasProhibidasGuessed(roomId, guesser)).then((ok) => {
              if (ok) setGuesser(null);
            });
          }}
          onPass={() => {
            void run(() => palabrasProhibidasPass(roomId));
          }}
        />
      );
    case 'watch':
      return (
        <WatchScreen
          aside={roundPill}
          notice={notice}
          {...card}
          describer={describer}
          busy={busy}
          error={error}
          onForbidden={() => {
            void run(() => palabrasProhibidasForbidden(roomId));
          }}
        />
      );
    case 'guess':
      return (
        <GuessScreen
          aside={roundPill}
          notice={notice}
          footer={waitingMark}
          describer={describer}
          watcher={watcher}
        />
      );
    case 'reveal':
      return (
        <RevealScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          {...card}
          outcome={
            game.result?.type === 'guessed'
              ? {
                  type: 'guessed',
                  guesser: nameOf(snapshot, game, game.result.user_id),
                  describer,
                }
              : game.result?.type === 'forbidden'
                ? { type: 'forbidden' }
                : { type: 'passed', describer }
          }
        />
      );
    case 'result': {
      const ranking = rankingRows(snapshot, game);
      return (
        <ResultScreen
          aside={pill(copy.room.pill(snapshot.room.code))}
          notice={notice}
          footer={controls}
          pill={copy.palabrasProhibidas.resultPill}
          accent="tomato"
          leaders={leaders(ranking)}
          ranking={ranking}
        />
      );
    }
  }
}
