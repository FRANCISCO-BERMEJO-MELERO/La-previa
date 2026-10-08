'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { kickPlayer, leaveRoom, setGame, type ActionResult } from '@/lib/actions';
import { copy, errorMessage, type ActionError } from '@/lib/copy';
import { clampImpostors } from '@/lib/impostors';
import { roomPath } from '@/lib/room-code';
import { shareRoomLink, type ShareOutcome } from '@/lib/share';
import type { Snapshot } from '@/lib/snapshot';
import { useRoomSync } from '@/lib/use-room-sync';
import { useWakeLock } from '@/lib/use-wake-lock';
import { viewFor } from '@/lib/view';
import { GamePickerScreen } from '@/screens/GamePickerScreen';
import { LeaveDialog } from '@/screens/LeaveDialog';
import { LobbyScreen } from '@/screens/LobbyScreen';
import { RoomGoneScreen } from '@/screens/RoomGoneScreen';
import { StatusScreen } from '@/screens/StatusScreen';

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
  useWakeLock(sync.status !== 'gone');

  if (sync.status === 'gone') return <RoomGoneScreen />;

  const snapshot = sync.snapshot ?? initial;
  const roomId = snapshot.room.id;

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

  if (viewFor(snapshot) !== 'lobby') {
    // Las pantallas de partida llegan con la fase 5.
    return <StatusScreen title={copy.late.pill} />;
  }

  if (picking && snapshot.me.is_host) {
    return withLeaveDialog(
      <GamePickerScreen
        roomCode={snapshot.room.code}
        busy={busy}
        error={error ? errorMessage(error) : undefined}
        offline={sync.offline}
        onLeaveRequest={openLeave}
        onOpen={() => {
          void run(() => setGame(roomId, 'impostor')).then((ok) => {
            if (!ok) return;
            setPicking(false);
            // Quita el ?nueva=1 para que recargar no vuelva a abrir el selector.
            window.history.replaceState(null, '', roomPath(snapshot.room.code));
          });
        }}
      />,
    );
  }

  // Room solo se monta en el navegador, tras comprobar la entrada, así que window existe.
  const roomUrl = new URL(roomPath(snapshot.room.code), window.location.origin).toString();

  return withLeaveDialog(
    <LobbyScreen
      snapshot={snapshot}
      impostors={clampImpostors(impostors, snapshot.players.length)}
      busy={busy}
      error={error ? errorMessage(error) : undefined}
      offline={sync.offline}
      onLeaveRequest={openLeave}
      roomUrl={roomUrl}
      qrOpen={qrOpen}
      shareOutcome={shareOutcome}
      onShare={() => {
        void shareRoomLink(roomUrl, copy.lobby.shareTitle(snapshot.room.code)).then(
          setShareOutcome,
        );
      }}
      onShowQr={() => {
        setQrOpen(true);
      }}
      onCloseQr={() => {
        setQrOpen(false);
      }}
      kickTarget={snapshot.players.find((player) => player.user_id === kickTargetId) ?? null}
      onImpostorsChange={setImpostors}
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
