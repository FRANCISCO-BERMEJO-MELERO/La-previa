'use client';

import type { HeaderTone } from '@/components/HeaderAside';
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
import { WaitScreen } from '@/games/rounds/WaitScreen';
import {
  cuelaAnswer,
  cuelaCloseVoting,
  cuelaCloseWriting,
  cuelaNext,
  cuelaStart,
  cuelaVote,
  type ActionResult,
} from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { CuelaGameState, Snapshot } from '@/lib/snapshot';
import { LateScreen } from '@/screens/LateScreen';
import { MineChip } from './cards';
import { revealData } from './game-view';
import { RevealScreen } from './RevealScreen';
import { viewFor } from './view';
import { VoteScreen } from './VoteScreen';
import { WriteScreen } from './WriteScreen';

type CuelaGameProps = {
  snapshot: Snapshot;
  game: CuelaGameState;
  /** Píldora de la cabecera que abre el diálogo de salir. */
  pill: (label: string, tone?: HeaderTone) => ReactNode;
  notice: ReactNode;
  busy: boolean;
  error?: string;
  /** Ejecuta una acción y aplica la foto que devuelve; resuelve si ha ido bien. */
  run: (action: () => Promise<ActionResult<Snapshot>>) => Promise<boolean>;
  onKickRequest: (userId: string) => void;
  onChangeGame: () => void;
  /** Recién llegada a la revelación: se anima (docs/PLAN-9.md §7). */
  revealing?: boolean;
};

/** Partida de Cuela la mentira: acciones del juego y pantalla según la foto. */
export function CuelaGame({
  snapshot,
  game,
  pill,
  notice,
  busy,
  error,
  run,
  onKickRequest,
  onChangeGame,
  revealing = false,
}: CuelaGameProps) {
  const [lie, setLie] = useState('');
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const roomId = snapshot.room.id;
  const isHost = snapshot.me.is_host;
  const host = hostName(snapshot);
  const active = activePlayers(snapshot, game);
  const roundPill = pill(copy.rounds.pill(game.round, game.total_rounds), 'sky');
  const options = game.options ?? [];
  const isTruth = error === copy.errors.is_truth;

  const controls = (
    <RoundControls
      inCharge={isHost}
      waiting={
        game.phase === 'writing'
          ? copy.cuela.waitingWriting(host)
          : game.phase === 'voting'
            ? copy.vote.waitingClose(host)
            : game.phase === 'reveal'
              ? copy.reveal.waitingHost(host)
              : copy.result.waitingHost(host)
      }
      finished={game.phase === 'finished'}
      advanceLabel={
        game.phase === 'writing'
          ? copy.cuela.closeWriting
          : game.phase === 'voting'
            ? copy.vote.close
            : isLastRound(game)
              ? copy.reveal.seeResult
              : copy.rounds.next
      }
      busy={busy}
      error={isTruth ? undefined : error}
      onAdvance={() => {
        void run(() =>
          game.phase === 'writing'
            ? cuelaCloseWriting(roomId)
            : game.phase === 'voting'
              ? cuelaCloseVoting(roomId)
              : cuelaNext(roomId),
        );
      }}
      onPlayAgain={() => {
        void run(() => restartOrLobby(roomId, () => cuelaStart(roomId, game.total_rounds)));
      }}
      onChangeGame={onChangeGame}
    />
  );

  const wait = (phase: 'writing' | 'voting', children: ReactNode) => (
    <WaitScreen
      aside={roundPill}
      notice={notice}
      footer={controls}
      label={phase === 'writing' ? copy.cuela.responded : copy.cuela.voted}
      done={active.filter((player) => player.hasResponded).length}
      total={active.length}
      responders={active}
      doneDetail={phase === 'writing' ? copy.cuela.respondedDetail : copy.vote.voted}
      hint={
        isHost
          ? phase === 'writing'
            ? copy.cuela.closeWritingHint
            : copy.vote.closeHint
          : undefined
      }
      busy={busy}
      onKickRequest={isHost ? onKickRequest : undefined}
    >
      <p className="text-md font-medium wrap-break-word">{game.question}</p>
      {children}
    </WaitScreen>
  );

  const view = viewFor(game);
  switch (view) {
    case 'late':
    case 'late_full':
      return (
        <LateScreen
          aside={roundPill}
          notice={notice}
          footer={
            isHost ? (
              controls
            ) : (
              <WaitingBox>
                {view === 'late' ? copy.late.waitingRound : copy.cuela.waitingSeat}
              </WaitingBox>
            )
          }
          text={view === 'late' ? copy.late.textRound : copy.cuela.lateFull}
          myName={snapshot.me.name}
          playing={active.map((player) => ({ ...player, muted: !player.connected }))}
        />
      );
    case 'write':
      return (
        <WriteScreen
          aside={roundPill}
          notice={notice}
          question={game.question}
          value={lie}
          busy={busy}
          error={isTruth ? undefined : error}
          truthWarning={isTruth ? error : undefined}
          onChange={setLie}
          onSubmit={() => {
            if (lie.trim() === '') return;
            void run(() => cuelaAnswer(roomId, lie)).then((ok) => {
              if (ok) setLie('');
            });
          }}
        />
      );
    case 'write_wait':
      return wait(
        'writing',
        game.my.answer ? <MineChip label={copy.cuela.yourLie} text={game.my.answer} /> : null,
      );
    case 'vote':
      return (
        <VoteScreen
          aside={roundPill}
          notice={notice}
          question={game.question}
          options={options}
          selected={voteTarget}
          busy={busy}
          error={error}
          onSelect={setVoteTarget}
          onVote={() => {
            if (!voteTarget) return;
            void run(() => cuelaVote(roomId, voteTarget)).then((ok) => {
              if (ok) setVoteTarget(null);
            });
          }}
        />
      );
    case 'vote_wait': {
      const voted = options.find((option) => option.id === game.my.voted_option_id);
      return wait(
        'voting',
        voted ? <MineChip label={copy.cuela.myVote} text={voted.text} /> : null,
      );
    }
    case 'reveal':
      return (
        <RevealScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          question={game.question}
          explanation={game.explanation}
          reveal={revealData(snapshot, game)}
          animate={revealing}
        />
      );
    case 'result': {
      const ranking = rankingRows(snapshot, game);
      return (
        <ResultScreen
          aside={pill(copy.result.finished)}
          notice={notice}
          footer={controls}
          pill={copy.cuela.resultPill}
          accent="sky"
          leaders={leaders(ranking)}
          ranking={ranking}
        />
      );
    }
  }
}
