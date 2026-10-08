'use client';

import { useState } from 'react';
import { kickPlayer, setGame, type ActionResult } from '@/lib/actions';
import { copy, errorMessage, type ActionError } from '@/lib/copy';
import { clampImpostors } from '@/lib/impostors';
import { roomPath } from '@/lib/room-code';
import { shareRoomLink, type ShareOutcome } from '@/lib/share';
import type { Snapshot } from '@/lib/snapshot';
import { useRoomSync } from '@/lib/use-room-sync';
import { viewFor } from '@/lib/view';
import { GamePickerScreen } from '@/screens/GamePickerScreen';
import { LobbyScreen } from '@/screens/LobbyScreen';
import { RoomGoneScreen } from '@/screens/RoomGoneScreen';
import { StatusScreen } from '@/screens/StatusScreen';

type RoomProps = {
  initial: Snapshot;
  /** Recién creada: el anfitrión empieza eligiendo juego. */
  fresh: boolean;
};

export function Room({ initial, fresh }: RoomProps) {
  const sync = useRoomSync(initial.room.id, initial);
  const [picking, setPicking] = useState(fresh);
  const [impostors, setImpostors] = useState(1);
  const [error, setError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState(false);
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [shareOutcome, setShareOutcome] = useState<ShareOutcome | null>(null);

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

  if (viewFor(snapshot) !== 'lobby') {
    // Las pantallas de partida llegan con la fase 5.
    return <StatusScreen title={copy.late.pill} />;
  }

  if (picking && snapshot.me.is_host) {
    return (
      <GamePickerScreen
        roomCode={snapshot.room.code}
        busy={busy}
        error={error ? errorMessage(error) : undefined}
        onOpen={() => {
          void run(() => setGame(roomId, 'impostor')).then((ok) => {
            if (!ok) return;
            setPicking(false);
            // Quita el ?nueva=1 para que recargar no vuelva a abrir el selector.
            window.history.replaceState(null, '', roomPath(snapshot.room.code));
          });
        }}
      />
    );
  }

  // Room solo se monta en el navegador, tras comprobar la entrada, así que window existe.
  const roomUrl = new URL(roomPath(snapshot.room.code), window.location.origin).toString();

  return (
    <LobbyScreen
      snapshot={snapshot}
      impostors={clampImpostors(impostors, snapshot.players.length)}
      busy={busy}
      error={error ? errorMessage(error) : undefined}
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
    />
  );
}
