'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { OfflineNotice } from '@/components/OfflineNotice';
import { PillButton } from '@/components/PillButton';
import { WaitingBox } from '@/components/WaitingBox';
import {
  backToLobby,
  castVote,
  closeVoting,
  continueGame,
  kickPlayer,
  leaveRoom,
  openVoting,
  setGame,
  startGame,
  type ActionResult,
} from '@/lib/actions';
import { copy, errorMessage, type ActionError } from '@/lib/copy';
import {
  aliveCount,
  connectedCount,
  hostName,
  namesOf,
  participant,
  participants,
  voteCandidates,
} from '@/lib/game-view';
import { clampImpostors } from '@/lib/impostors';
import { roomPath } from '@/lib/room-code';
import { shareRoomLink, type ShareOutcome } from '@/lib/share';
import type { GameState, Snapshot } from '@/lib/snapshot';
import { useRoomSync } from '@/lib/use-room-sync';
import { useWakeLock } from '@/lib/use-wake-lock';
import { viewFor } from '@/lib/view';
import { DealScreen } from '@/screens/DealScreen';
import { GamePickerScreen } from '@/screens/GamePickerScreen';
import { HostControls } from '@/screens/HostControls';
import { LateScreen } from '@/screens/LateScreen';
import { LeaveDialog } from '@/screens/LeaveDialog';
import { LobbyScreen } from '@/screens/LobbyScreen';
import { OutScreen } from '@/screens/OutScreen';
import { ResultScreen } from '@/screens/ResultScreen';
import { RevealScreen } from '@/screens/RevealScreen';
import { RoomGoneScreen } from '@/screens/RoomGoneScreen';
import { TieScreen } from '@/screens/TieScreen';
import { VoteScreen } from '@/screens/VoteScreen';
import { VoteWaitScreen } from '@/screens/VoteWaitScreen';

type RoomProps = {
  initial: Snapshot;
  /** Recién creada: el anfitrión empieza eligiendo juego. */
  fresh: boolean;
};

export function Room({ initial, fresh }: RoomProps) {
  const router = useRouter();
  const sync = useRoomSync(initial.room.id, initial);
  const [picking, setPicking] = useState(fresh);
  const [impostors, setImpostors] = useState(1);
  const [error, setError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState(false);
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [shareOutcome, setShareOutcome] = useState<ShareOutcome | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState<ActionError | null>(null);
  const [voteTarget, setVoteTarget] = useState<string | null>(null);
  useWakeLock(sync.status !== 'gone');

  if (sync.status === 'gone') return <RoomGoneScreen />;

  const snapshot = sync.snapshot ?? initial;
  const roomId = snapshot.room.id;
  const code = snapshot.room.code;
  const errorText = error ? errorMessage(error) : undefined;

  const run = async (action: () => Promise<ActionResult<Snapshot>>) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    sync.apply(result.data);
    return true;
  };

  const leave = async () => {
    setBusy(true);
    setLeaveError(null);
    const result = await leaveRoom(roomId);
    if (result.ok) {
      router.push('/');
      return;
    }
    setBusy(false);
    setLeaveError(result.error);
  };

  const openLeave = () => {
    setLeaveError(null);
    setLeaveOpen(true);
  };

  const pill = (label: string, tone: 'paper' | 'tomato' | 'sky' | 'lilac' = 'paper') => (
    <PillButton
      tone={tone}
      tilted={tone !== 'paper'}
      label={label}
      hint={copy.room.leave}
      onClick={openLeave}
    />
  );

  const notice = sync.offline ? <OfflineNotice>{copy.errors.offline}</OfflineNotice> : null;

  const withLeaveDialog = (screen: ReactNode) => (
    <>
      {screen}
      <LeaveDialog
        open={leaveOpen}
        busy={busy}
        error={leaveError ? errorMessage(leaveError) : undefined}
        onCancel={() => {
          setLeaveOpen(false);
        }}
        onConfirm={() => {
          void leave();
        }}
      />
    </>
  );

  const view = viewFor(snapshot);
  const { game } = snapshot;

  if (view !== 'lobby' && game) {
    return withLeaveDialog(
      <GameView
        snapshot={snapshot}
        game={game}
        view={view}
        roomPill={pill(copy.room.pill(code))}
        votePill={pill(copy.vote.pill, 'sky')}
        outPill={pill(copy.out.pill, 'lilac')}
        notice={notice}
        busy={busy}
        error={errorText}
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
            const again = await startGame(roomId, game.impostor_count);
            // Si ya no vale (se ha ido gente), se vuelve a la sala de espera para ajustarlo.
            const noLongerValid =
              !again.ok &&
              (again.error === 'not_enough_players' || again.error === 'invalid_impostor_count');
            return noLongerValid ? backToLobby(roomId) : again;
          });
        }}
        onChangeGame={() => {
          void run(() => backToLobby(roomId)).then((ok) => {
            if (ok) setPicking(true);
          });
        }}
      />,
    );
  }

  if (picking && snapshot.me.is_host) {
    return withLeaveDialog(
      <GamePickerScreen
        roomCode={code}
        busy={busy}
        error={errorText}
        offline={sync.offline}
        onLeaveRequest={openLeave}
        onOpen={() => {
          void run(() => setGame(roomId, 'impostor')).then((ok) => {
            if (!ok) return;
            setPicking(false);
            // Quita el ?nueva=1 para que recargar no vuelva a abrir el selector.
            window.history.replaceState(null, '', roomPath(code));
          });
        }}
      />,
    );
  }

  // Room solo se monta en el navegador, tras comprobar la entrada, así que window existe.
  const roomUrl = new URL(roomPath(code), window.location.origin).toString();
  const impostorCount = clampImpostors(impostors, snapshot.players.length);

  return withLeaveDialog(
    <LobbyScreen
      snapshot={snapshot}
      impostors={impostorCount}
      busy={busy}
      error={errorText}
      offline={sync.offline}
      onLeaveRequest={openLeave}
      roomUrl={roomUrl}
      qrOpen={qrOpen}
      shareOutcome={shareOutcome}
      onShare={() => {
        void shareRoomLink(roomUrl, copy.lobby.shareTitle(code)).then(setShareOutcome);
      }}
      onShowQr={() => {
        setQrOpen(true);
      }}
      onCloseQr={() => {
        setQrOpen(false);
      }}
      kickTarget={snapshot.players.find((player) => player.user_id === kickTargetId) ?? null}
      onImpostorsChange={setImpostors}
      onStart={() => {
        void run(() => startGame(roomId, impostorCount));
      }}
      onKickRequest={setKickTargetId}
      onKickCancel={() => {
        setKickTargetId(null);
      }}
      onKickConfirm={() => {
        if (!kickTargetId) return;
        setKickTargetId(null);
        void run(() => kickPlayer(roomId, kickTargetId));
      }}
    />,
  );
}

type GameViewProps = {
  snapshot: Snapshot;
  game: GameState;
  view: Exclude<ReturnType<typeof viewFor>, 'lobby'>;
  roomPill: ReactNode;
  votePill: ReactNode;
  outPill: ReactNode;
  notice: ReactNode;
  busy: boolean;
  error?: string;
  voteTarget: string | null;
  onSelectTarget: (userId: string) => void;
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
    muted: !player.connected,
  }));

  switch (view) {
    case 'late':
      return (
        <LateScreen
          aside={roomPill}
          notice={notice}
          footer={isHost ? controls : <WaitingBox>{copy.late.waiting}</WaitingBox>}
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
