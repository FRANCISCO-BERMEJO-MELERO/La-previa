'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { OfflineNotice } from '@/components/OfflineNotice';
import { PillButton } from '@/components/PillButton';
import { ImpostorGame } from '@/games/impostor/ImpostorGame';
import { clampImpostors } from '@/games/impostor/impostors';
import { ProbableGame } from '@/games/probable/ProbableGame';
import {
  backToLobby,
  kickPlayer,
  leaveRoom,
  probableStart,
  setGame,
  startGame,
  type ActionResult,
} from '@/lib/actions';
import { copy, errorMessage, type ActionError } from '@/lib/copy';
import { roomPath } from '@/lib/room-code';
import { DEFAULT_ROUNDS } from '@/lib/rounds';
import { shareRoomLink, type ShareOutcome } from '@/lib/share';
import type { GameId, Snapshot } from '@/lib/snapshot';
import { useRoomSync } from '@/lib/use-room-sync';
import { useWakeLock } from '@/lib/use-wake-lock';
import { GamePickerScreen } from '@/screens/GamePickerScreen';
import { KickDialog } from '@/screens/KickDialog';
import { LeaveDialog } from '@/screens/LeaveDialog';
import { LobbyScreen } from '@/screens/LobbyScreen';
import { RoomGoneScreen } from '@/screens/RoomGoneScreen';

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
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS);
  const [pickedGame, setPickedGame] = useState<GameId | null>(null);
  const [error, setError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState(false);
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [shareOutcome, setShareOutcome] = useState<ShareOutcome | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState<ActionError | null>(null);
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

  const kickTarget = snapshot.players.find((player) => player.user_id === kickTargetId);

  const withLeaveDialog = (screen: ReactNode) => (
    <>
      {screen}
      <KickDialog
        name={kickTarget?.name ?? null}
        busy={busy}
        onCancel={() => {
          setKickTargetId(null);
        }}
        onConfirm={() => {
          if (!kickTarget) return;
          setKickTargetId(null);
          void run(() => kickPlayer(roomId, kickTarget.user_id));
        }}
      />
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

  const { game } = snapshot;

  if (game) {
    const shared = {
      snapshot,
      pill,
      notice,
      busy,
      error: errorText,
      run,
      onKickRequest: setKickTargetId,
      onChangeGame: () => {
        void run(() => backToLobby(roomId)).then((ok) => {
          if (ok) setPicking(true);
        });
      },
    };
    switch (game.type) {
      case 'impostor':
        return withLeaveDialog(<ImpostorGame {...shared} game={game} />);
      case 'probable':
        return withLeaveDialog(<ProbableGame {...shared} game={game} />);
    }
  }

  if (picking && snapshot.me.is_host) {
    return withLeaveDialog(
      <GamePickerScreen
        roomCode={code}
        selected={pickedGame ?? snapshot.room.game}
        busy={busy}
        error={errorText}
        offline={sync.offline}
        onLeaveRequest={openLeave}
        onSelect={setPickedGame}
        onOpen={() => {
          void run(() => setGame(roomId, pickedGame ?? snapshot.room.game)).then((ok) => {
            if (!ok) return;
            setPicking(false);
            setPickedGame(null);
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
      onImpostorsChange={setImpostors}
      rounds={rounds}
      onRoundsChange={setRounds}
      onStart={() => {
        void run(() =>
          snapshot.room.game === 'impostor'
            ? startGame(roomId, impostorCount)
            : probableStart(roomId, rounds),
        );
      }}
      onKickRequest={setKickTargetId}
    />,
  );
}
