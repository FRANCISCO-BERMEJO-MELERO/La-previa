'use client';

import { useState, type ReactNode } from 'react';
import { WaitingBox } from '@/components/WaitingBox';
import {
  backToLobby,
  probableClose,
  probableNext,
  probableStart,
  probableVote,
  type ActionResult,
} from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { ProbableGameState, Snapshot } from '@/lib/snapshot';
import { LateScreen } from '@/screens/LateScreen';
import {
  activePlayers,
  isLastRound,
  leaders,
  playerName,
  rankingRows,
  tallyRows,
} from './game-view';
import { HostControls } from './HostControls';
import { ResultScreen } from './ResultScreen';
import { RevealScreen } from './RevealScreen';
import { viewFor } from './view';
import { VoteScreen } from './VoteScreen';
import { VoteWaitScreen } from './VoteWaitScreen';

type PillTone = 'paper' | 'tomato' | 'sky' | 'lilac';

type ProbableGameProps = {
  snapshot: Snapshot;
  game: ProbableGameState;
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
  const active = activePlayers(snapshot, game);
  const roundPill = pill(copy.rounds.pill(game.round, game.total_rounds), 'sky');
  const controls = (
    <HostControls
      phase={game.phase}
      isHost={isHost}
      hostName={
        snapshot.players.find((player) => player.user_id === snapshot.room.host_id)?.name ?? ''
      }
      lastRound={isLastRound(game)}
      busy={busy}
      error={error}
      onClose={() => {
        void run(() => probableClose(roomId));
      }}
      onNext={() => {
        void run(() => probableNext(roomId));
      }}
      onPlayAgain={() => {
        void run(async () => {
          const again = await probableStart(roomId, game.total_rounds);
          // Si se ha ido gente y ya no hay bastantes, se vuelve a la sala de espera.
          return !again.ok && again.error === 'not_enough_players' ? backToLobby(roomId) : again;
        });
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
        <VoteWaitScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          prompt={game.prompt}
          voters={active}
          myVote={game.my.voted_for ? playerName(snapshot, game, game.my.voted_for) : null}
          hint={isHost ? copy.vote.closeHint : undefined}
          busy={busy}
          onKickRequest={isHost ? onKickRequest : undefined}
        />
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
          leaders={leaders(ranking)}
          ranking={ranking}
        />
      );
    }
  }
}
