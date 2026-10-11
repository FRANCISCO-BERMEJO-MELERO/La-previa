'use client';

import type { HeaderTone } from '@/components/HeaderAside';
import { useState, type ReactNode } from 'react';
import { WaitingBox } from '@/components/WaitingBox';
import {
  activePlayers,
  hostName,
  isLastRound,
  leaders,
  playerName,
  rankingRows,
} from '@/games/rounds/game-view';
import { restartOrLobby } from '@/games/rounds/restart';
import { ResultScreen } from '@/games/rounds/ResultScreen';
import { RoundControls } from '@/games/rounds/RoundControls';
import { WaitScreen } from '@/games/rounds/WaitScreen';
import {
  probableClose,
  probableNext,
  probableStart,
  probableVote,
  type ActionResult,
} from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { ProbableGameState, Snapshot } from '@/lib/snapshot';
import { LateScreen } from '@/screens/LateScreen';
import { tallyRows } from './game-view';
import { RevealScreen } from './RevealScreen';
import { viewFor } from './view';
import { VoteScreen } from './VoteScreen';

type ProbableGameProps = {
  snapshot: Snapshot;
  game: ProbableGameState;
  /** Píldora de la cabecera que abre el diálogo de salir. */
  pill: (label: string, tone?: HeaderTone) => ReactNode;
  notice: ReactNode;
  busy: boolean;
  error?: string;
  /** Ejecuta una acción y aplica la foto que devuelve; resuelve si ha ido bien. */
  run: (action: () => Promise<ActionResult<Snapshot>>) => Promise<boolean>;
  onKickRequest: (userId: string) => void;
  onChangeGame: () => void;
};

/** Partida de ¿Quién es más probable que…?: acciones del juego y pantalla según la foto. */
export function ProbableGame({
  snapshot,
  game,
  pill,
  notice,
  busy,
  error,
  run,
  onKickRequest,
  onChangeGame,
}: ProbableGameProps) {
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const roomId = snapshot.room.id;
  const isHost = snapshot.me.is_host;
  const host = hostName(snapshot);
  const active = activePlayers(snapshot, game);
  const roundPill = pill(copy.rounds.pill(game.round, game.total_rounds), 'sky');
  const controls = (
    <RoundControls
      inCharge={isHost}
      waiting={
        game.phase === 'voting'
          ? copy.vote.waitingClose(host)
          : game.phase === 'reveal'
            ? copy.reveal.waitingHost(host)
            : copy.result.waitingHost(host)
      }
      finished={game.phase === 'finished'}
      advanceLabel={
        game.phase === 'voting'
          ? copy.vote.close
          : isLastRound(game)
            ? copy.reveal.seeResult
            : copy.rounds.next
      }
      busy={busy}
      error={error}
      onAdvance={() => {
        void run(() => (game.phase === 'voting' ? probableClose(roomId) : probableNext(roomId)));
      }}
      onPlayAgain={() => {
        void run(() => restartOrLobby(roomId, () => probableStart(roomId, game.total_rounds)));
      }}
      onChangeGame={onChangeGame}
    />
  );

  switch (viewFor(game)) {
    case 'late':
      return (
        <LateScreen
          aside={roundPill}
          notice={notice}
          footer={isHost ? controls : <WaitingBox>{copy.late.waitingRound}</WaitingBox>}
          text={copy.late.textRound}
          myName={snapshot.me.name}
          playing={active.map((player) => ({ ...player, muted: !player.connected }))}
        />
      );
    case 'vote':
      return (
        <VoteScreen
          aside={roundPill}
          notice={notice}
          prompt={game.prompt}
          candidates={active}
          selected={voteTarget}
          busy={busy}
          error={error}
          onSelect={setVoteTarget}
          onVote={() => {
            if (!voteTarget) return;
            void run(() => probableVote(roomId, voteTarget)).then((ok) => {
              if (ok) setVoteTarget(null);
            });
          }}
        />
      );
    case 'vote_wait':
      return (
        <WaitScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          label={copy.probable.voted}
          done={active.filter((player) => player.hasResponded).length}
          total={active.length}
          responders={active}
          doneDetail={copy.vote.voted}
          hint={isHost ? copy.vote.closeHint : undefined}
          busy={busy}
          onKickRequest={isHost ? onKickRequest : undefined}
        >
          <p className="text-md font-medium">{copy.probable.prompt(game.prompt)}</p>
          {game.my.voted_for ? (
            <p className="text-base font-bold">
              {copy.vote.mine(playerName(snapshot, game, game.my.voted_for))}
            </p>
          ) : null}
        </WaitScreen>
      );
    case 'reveal':
      return (
        <RevealScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          prompt={game.prompt}
          tally={tallyRows(snapshot, game)}
        />
      );
    case 'result': {
      const ranking = rankingRows(snapshot, game);
      return (
        <ResultScreen
          aside={pill(copy.room.pill(snapshot.room.code))}
          notice={notice}
          footer={controls}
          pill={copy.probable.resultPill}
          accent="sky"
          leaders={leaders(ranking)}
          ranking={ranking}
        />
      );
    }
  }
}
