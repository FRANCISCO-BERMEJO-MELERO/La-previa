'use client';

import type { HeaderTone } from '@/components/HeaderAside';
import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { WaitingBox } from '@/components/WaitingBox';
import {
  backToLobby,
  castVote,
  closeVoting,
  continueGame,
  openVoting,
  startGame,
  type ActionResult,
} from '@/lib/actions';
import { copy } from '@/lib/copy';
import { useCountdown } from '@/lib/use-countdown';
import type { ImpostorGameState, Snapshot } from '@/lib/snapshot';
import { DealScreen } from './DealScreen';
import {
  aliveCount,
  connectedCount,
  hostName,
  namesOf,
  participant,
  participants,
  voteCandidates,
} from './game-view';
import { HostControls } from './HostControls';
import { LateScreen } from '@/screens/LateScreen';
import { OutScreen } from './OutScreen';
import { ResultScreen } from './ResultScreen';
import { RevealScreen } from './RevealScreen';
import { TieScreen } from './TieScreen';
import { viewFor } from './view';
import { VoteScreen } from './VoteScreen';
import { VoteWaitScreen } from './VoteWaitScreen';

const CLOSE_RETRIES = 3;
const CLOSE_RETRY_MS = 1500;

type ImpostorGameProps = {
  snapshot: Snapshot;
  game: ImpostorGameState;
  /** Píldora de la cabecera que abre el diálogo de salir. */
  pill: (label: string, tone?: HeaderTone) => ReactNode;
  notice: ReactNode;
  busy: boolean;
  error?: string;
  /** Ejecuta una acción y aplica la foto que devuelve; resuelve si ha ido bien. */
  run: (action: () => Promise<ActionResult<Snapshot>>) => Promise<boolean>;
  onKickRequest: (userId: string) => void;
  onChangeGame: () => void;
  /** Temáticas elegidas en la sala de espera, para volver a jugar con las mismas. */
  categories: readonly string[];
};

/** Partida de El impostor: acciones del juego y pantalla que toca según la foto. */
export function ImpostorGame({
  snapshot,
  game,
  pill,
  run,
  onChangeGame,
  categories,
  ...rest
}: ImpostorGameProps) {
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  const roomId = snapshot.room.id;
  const deadline = game.phase === 'voting' ? game.voting_deadline : null;
  const timeLeft = useCountdown(deadline, snapshot.server_time);
  const closeWhenDue = useEffectEvent(() => closeVoting(roomId));

  // Al llegar a cero, cada móvil pide cerrar una vez: el primero lo consigue y la foto nueva llega
  // a todos por la sincronización. Si la base de datos aún no ve pasada la hora (relojes un poco
  // distintos), se reintenta. Los demás fallos (otro ya la cerró) no tienen nada que enseñar.
  useEffect(() => {
    if (deadline === null || timeLeft !== 0) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const attempt = (triesLeft: number) => {
      void closeWhenDue().then((result) => {
        if (cancelled || result.ok || result.error !== 'not_host' || triesLeft === 0) return;
        retry = setTimeout(() => {
          attempt(triesLeft - 1);
        }, CLOSE_RETRY_MS);
      });
    };
    attempt(CLOSE_RETRIES);
    return () => {
      cancelled = true;
      clearTimeout(retry);
    };
  }, [deadline, timeLeft]);

  const view = viewFor(snapshot);
  if (view === 'lobby') return null;

  return (
    <GameView
      {...rest}
      snapshot={snapshot}
      game={game}
      view={view}
      roomPill={pill(
        // A partir de la segunda ronda se dice, para que no parezca una partida nueva.
        game.phase === 'finished'
          ? copy.result.finished
          : game.round > 1
            ? copy.reveal.roundPill(game.round)
            : copy.room.pill(snapshot.room.code),
      )}
      votePill={pill(timeLeft === null ? copy.vote.pill : copy.vote.pillTimed(timeLeft), 'sky')}
      outPill={pill(copy.out.pill, 'lilac')}
      voteTarget={voteTarget}
      onSelectTarget={setVoteTarget}
      onVote={() => {
        if (!voteTarget) return;
        void run(() => castVote(roomId, voteTarget)).then((ok) => {
          if (ok) setVoteTarget(null);
        });
      }}
      onOpenVoting={() => {
        void run(() => openVoting(roomId));
      }}
      onCloseVoting={() => {
        void run(() => closeVoting(roomId));
      }}
      onContinue={() => {
        void run(() => continueGame(roomId));
      }}
      onPlayAgain={() => {
        void run(async () => {
          const again = await startGame(roomId, {
            impostorCount: game.impostor_count,
            categories,
            voteSeconds: game.vote_seconds,
          });
          // Si ya no vale (se ha ido gente), se vuelve a la sala de espera para ajustarlo.
          const noLongerValid =
            !again.ok &&
            (again.error === 'not_enough_players' || again.error === 'invalid_impostor_count');
          return noLongerValid ? backToLobby(roomId) : again;
        });
      }}
      onChangeGame={onChangeGame}
    />
  );
}

type GameViewProps = {
  snapshot: Snapshot;
  game: ImpostorGameState;
  view: Exclude<ReturnType<typeof viewFor>, 'lobby'>;
  roomPill: ReactNode;
  votePill: ReactNode;
  outPill: ReactNode;
  notice: ReactNode;
  busy: boolean;
  error?: string;
  voteTarget: string | null;
  onSelectTarget: (userId: string) => void;
  onKickRequest: (userId: string) => void;
  onVote: () => void;
  onOpenVoting: () => void;
  onCloseVoting: () => void;
  onContinue: () => void;
  onPlayAgain: () => void;
  onChangeGame: () => void;
};

/** Elige la pantalla de partida que toca según la vista deducida de la foto. */
function GameView({
  snapshot,
  game,
  view,
  roomPill,
  votePill,
  outPill,
  notice,
  busy,
  error,
  voteTarget,
  onSelectTarget,
  onKickRequest,
  onVote,
  ...handlers
}: GameViewProps) {
  const isHost = snapshot.me.is_host;
  const all = participants(snapshot, game);
  const controls = (
    <HostControls
      phase={game.phase}
      isHost={isHost}
      hostName={hostName(snapshot)}
      gameOver={game.game_over}
      busy={busy}
      error={error}
      {...handlers}
    />
  );
  const roomAvatars = snapshot.players.map((player, index) => ({
    userId: player.user_id,
    name: player.name,
    joinIndex: index,
    avatar: player.avatar,
    muted: !player.connected,
  }));

  switch (view) {
    case 'late':
      return (
        <LateScreen
          aside={roomPill}
          notice={notice}
          footer={isHost ? controls : <WaitingBox>{copy.late.waiting}</WaitingBox>}
          text={copy.late.text}
          myName={snapshot.me.name}
          playing={all.filter((p) => p.alive).map((p) => ({ ...p, muted: !p.connected }))}
        />
      );
    case 'deal_player':
    case 'deal_impostor':
      return (
        <DealScreen
          aside={roomPill}
          notice={notice}
          footer={controls}
          role={view === 'deal_impostor' ? 'impostor' : 'player'}
          word={game.my.word}
          category={game.category}
          players={roomAvatars}
          connected={connectedCount(snapshot)}
        />
      );
    case 'vote':
      return (
        <VoteScreen
          aside={votePill}
          notice={notice}
          myName={snapshot.me.name}
          candidates={voteCandidates(snapshot, game)}
          selected={voteTarget}
          busy={busy}
          error={error}
          onSelect={onSelectTarget}
          onVote={onVote}
        />
      );
    case 'vote_wait': {
      const myVote = game.my.voted_for ? participant(snapshot, game, game.my.voted_for) : undefined;
      return (
        <VoteWaitScreen
          aside={votePill}
          notice={notice}
          footer={controls}
          voters={all.filter((p) => p.alive)}
          myVote={myVote?.name ?? null}
          hint={isHost ? copy.vote.closeHint : undefined}
          busy={busy}
          onKickRequest={isHost ? onKickRequest : undefined}
        />
      );
    }
    case 'reveal': {
      const outcome = game.outcome;
      if (!outcome || outcome.type === 'tie') return null;
      const who = participant(snapshot, game, outcome.user_id);
      return (
        <RevealScreen
          aside={roomPill}
          notice={notice}
          footer={controls}
          kind={outcome.type}
          name={outcome.name}
          joinIndex={who?.joinIndex ?? 0}
          avatar={who?.avatar}
          wasImpostor={outcome.was_impostor}
          summary={
            game.game_over
              ? copy.reveal.gameOver
              : copy.reveal.continues(aliveCount(game), game.impostors_left)
          }
        />
      );
    }
    case 'tie': {
      const tiedIds = game.outcome?.type === 'tie' ? game.outcome.user_ids : [];
      return (
        <TieScreen
          aside={roomPill}
          notice={notice}
          footer={controls}
          tied={all.filter((p) => tiedIds.includes(p.userId))}
        />
      );
    }
    case 'out':
      return (
        <OutScreen
          aside={outPill}
          notice={notice}
          footer={
            isHost ? (
              controls
            ) : (
              <WaitingBox>
                {game.phase === 'voting' ? copy.out.voting : copy.out.talking}
              </WaitingBox>
            )
          }
          myName={snapshot.me.name}
          stillPlaying={all.filter((p) => p.alive)}
        />
      );
    case 'won':
    case 'lost':
    case 'result_spectator': {
      const result = game.result;
      if (!result) return null;
      return (
        <ResultScreen
          aside={roomPill}
          notice={notice}
          footer={controls}
          outcome={view === 'won' ? 'won' : view === 'lost' ? 'lost' : 'spectator'}
          winner={result.winner}
          impostorNames={namesOf(snapshot, game, result.impostor_ids)}
          word={result.word}
        />
      );
    }
  }
}
