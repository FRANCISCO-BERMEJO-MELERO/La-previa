'use client';

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
  quienLoDijoAnswer,
  quienLoDijoCloseVoting,
  quienLoDijoCloseWriting,
  quienLoDijoNext,
  quienLoDijoStart,
  quienLoDijoVote,
  type ActionResult,
} from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { QuienLoDijoGameState, Snapshot } from '@/lib/snapshot';
import { LateScreen } from '@/screens/LateScreen';
import { FeaturedCard } from './cards';
import { revealData } from './game-view';
import { RevealScreen } from './RevealScreen';
import { viewFor } from './view';
import { VoteScreen } from './VoteScreen';
import { WriteScreen } from './WriteScreen';

type PillTone = 'paper' | 'tomato' | 'sky' | 'lilac';

type QuienLoDijoGameProps = {
  snapshot: Snapshot;
  game: QuienLoDijoGameState;
  /** Píldora de la cabecera que abre el diálogo de salir. */
  pill: (label: string, tone?: PillTone) => ReactNode;
  notice: ReactNode;
  busy: boolean;
  error?: string;
  /** Ejecuta una acción y aplica la foto que devuelve; resuelve si ha ido bien. */
  run: (action: () => Promise<ActionResult<Snapshot>>) => Promise<boolean>;
  onKickRequest: (userId: string) => void;
  onChangeGame: () => void;
};

/** Partida de ¿Quién lo dijo?: acciones del juego y pantalla según la foto. */
export function QuienLoDijoGame({
  snapshot,
  game,
  pill,
  notice,
  busy,
  error,
  run,
  onKickRequest,
  onChangeGame,
}: QuienLoDijoGameProps) {
  const [answer, setAnswer] = useState('');
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const roomId = snapshot.room.id;
  const isHost = snapshot.me.is_host;
  const host = hostName(snapshot);
  const active = activePlayers(snapshot, game);
  const roundPill = pill(copy.rounds.pill(game.round, game.total_rounds), 'lilac');
  const featured = game.featured_text ?? '';
  const voteProgress = game.vote_progress ?? { voted: 0, total: 0 };

  const controls = (
    <RoundControls
      isHost={isHost}
      waiting={
        game.phase === 'writing'
          ? copy.quienLoDijo.waitingWriting(host)
          : game.phase === 'voting'
            ? copy.vote.waitingClose(host)
            : game.phase === 'reveal'
              ? copy.reveal.waitingHost(host)
              : copy.result.waitingHost(host)
      }
      finished={game.phase === 'finished'}
      advanceLabel={
        game.phase === 'writing'
          ? copy.quienLoDijo.closeWriting
          : game.phase === 'voting'
            ? copy.vote.close
            : isLastRound(game)
              ? copy.reveal.seeResult
              : copy.rounds.next
      }
      busy={busy}
      error={error}
      onAdvance={() => {
        void run(() =>
          game.phase === 'writing'
            ? quienLoDijoCloseWriting(roomId)
            : game.phase === 'voting'
              ? quienLoDijoCloseVoting(roomId)
              : quienLoDijoNext(roomId),
        );
      }}
      onPlayAgain={() => {
        void run(() => restartOrLobby(roomId, () => quienLoDijoStart(roomId, game.total_rounds)));
      }}
      onChangeGame={onChangeGame}
    />
  );

  const voteWait = (children: ReactNode) => (
    <WaitScreen
      aside={roundPill}
      notice={notice}
      footer={controls}
      label={copy.quienLoDijo.voted}
      done={voteProgress.voted}
      total={voteProgress.total}
      doneDetail={copy.vote.voted}
      hint={isHost ? copy.vote.closeHint : undefined}
      busy={busy}
    >
      {children}
    </WaitScreen>
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
    case 'write':
      return (
        <WriteScreen
          aside={roundPill}
          notice={notice}
          prompt={game.prompt}
          value={answer}
          busy={busy}
          error={error}
          onChange={setAnswer}
          onSubmit={() => {
            if (answer.trim() === '') return;
            void run(() => quienLoDijoAnswer(roomId, answer)).then((ok) => {
              if (ok) setAnswer('');
            });
          }}
        />
      );
    case 'write_wait':
      return (
        <WaitScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          label={copy.quienLoDijo.responded}
          done={active.filter((player) => player.hasResponded).length}
          total={active.length}
          responders={active}
          doneDetail={copy.quienLoDijo.respondedDetail}
          hint={isHost ? copy.quienLoDijo.closeWritingHint : undefined}
          busy={busy}
          onKickRequest={isHost ? onKickRequest : undefined}
        >
          <p className="text-md font-medium">{game.prompt}</p>
          {game.my.answer ? (
            <p className="text-base font-bold">{copy.quienLoDijo.mine(game.my.answer)}</p>
          ) : null}
        </WaitScreen>
      );
    case 'vote':
      return (
        <VoteScreen
          aside={roundPill}
          notice={notice}
          featuredText={featured}
          candidates={active.filter((player) => player.userId !== snapshot.me.user_id)}
          selected={voteTarget}
          busy={busy}
          error={error}
          onSelect={setVoteTarget}
          onVote={() => {
            if (!voteTarget) return;
            void run(() => quienLoDijoVote(roomId, voteTarget)).then((ok) => {
              if (ok) setVoteTarget(null);
            });
          }}
        />
      );
    case 'author':
      return voteWait(
        <>
          <FeaturedCard text={featured} label={copy.quienLoDijo.yours} />
          <p className="text-base font-bold">{copy.quienLoDijo.yoursText}</p>
        </>,
      );
    case 'vote_wait':
      return voteWait(
        <>
          <p className="text-md font-medium">{copy.quienLoDijo.quoted(featured)}</p>
          {game.my.voted_for ? (
            <p className="text-base font-bold">
              {copy.vote.mine(playerName(snapshot, game, game.my.voted_for))}
            </p>
          ) : null}
        </>,
      );
    case 'reveal':
      return (
        <RevealScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          featuredText={game.featured_text}
          reveal={revealData(snapshot, game)}
        />
      );
    case 'result': {
      const ranking = rankingRows(snapshot, game);
      return (
        <ResultScreen
          aside={pill(copy.room.pill(snapshot.room.code))}
          notice={notice}
          footer={controls}
          pill={copy.quienLoDijo.resultPill}
          accent="lilac"
          leaders={leaders(ranking)}
          ranking={ranking}
        />
      );
    }
  }
}
