'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { OfflineNotice } from '@/components/OfflineNotice';
import { HeaderAside, type HeaderTone } from '@/components/HeaderAside';
import { ImpostorGame } from '@/games/impostor/ImpostorGame';
import { clampImpostors } from '@/games/impostor/impostors';
import { PalabrasProhibidasGame } from '@/games/palabras-prohibidas/PalabrasProhibidasGame';
import { ProbableGame } from '@/games/probable/ProbableGame';
import { QuePrefieresGame } from '@/games/que-prefieres/QuePrefieresGame';
import { QuienLoDijoGame } from '@/games/quien-lo-dijo/QuienLoDijoGame';
import { UnaPistaGame } from '@/games/una-pista/UnaPistaGame';
import {
  backToLobby,
  kickPlayer,
  leaveRoom,
  palabrasProhibidasStart,
  probableStart,
  quePrefieresStart,
  quienLoDijoStart,
  unaPistaStart,
  setAvatar,
  setGame,
  startGame,
  type ActionResult,
} from '@/lib/actions';
import { copy, errorMessage, type ActionError } from '@/lib/copy';
import { roomPath } from '@/lib/room-code';
import { DEFAULT_ROUNDS } from '@/lib/rounds';
import { shareRoomLink, type ShareOutcome } from '@/lib/share';
import type { GameId, Snapshot } from '@/lib/snapshot';
import { useImpostorCategories } from '@/lib/use-impostor-categories';
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
  const [chosenCategories, setChosenCategories] = useState<string[]>([]);
  const [voteSeconds, setVoteSeconds] = useState<number | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [pickedGame, setPickedGame] = useState<GameId | null>(null);
  const [error, setError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState(false);
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [shareOutcome, setShareOutcome] = useState<ShareOutcome | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState<ActionError | null>(null);
  useWakeLock(sync.status !== 'gone');
  const lobbyGame = sync.snapshot ?? initial;
  const categories = useImpostorCategories(
    lobbyGame.me.is_host && lobbyGame.room.game === 'impostor' && lobbyGame.game === null,
  );

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

  const pill = (label: string, tone: HeaderTone = 'paper') => (
    <HeaderAside tone={tone} tilted={tone !== 'paper'} label={label} onLeave={openLeave} />
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
        return withLeaveDialog(
          <ImpostorGame {...shared} game={game} categories={chosenCategories} />,
        );
      case 'probable':
        return withLeaveDialog(<ProbableGame {...shared} game={game} />);
      case 'quien_lo_dijo':
        return withLeaveDialog(<QuienLoDijoGame {...shared} game={game} />);
      case 'una_pista':
        return withLeaveDialog(<UnaPistaGame {...shared} game={game} />);
      case 'que_prefieres':
        return withLeaveDialog(<QuePrefieresGame {...shared} game={game} />);
      case 'palabras_prohibidas':
        return withLeaveDialog(<PalabrasProhibidasGame {...shared} game={game} />);
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
      howToOpen={howToOpen}
      avatarOpen={avatarOpen}
      onAvatarOpen={() => {
        setAvatarOpen(true);
      }}
      onAvatarClose={() => {
        setAvatarOpen(false);
      }}
      onAvatarChange={(avatar) => {
        void run(() => setAvatar(roomId, avatar));
      }}
      onHowToOpen={() => {
        setHowToOpen(true);
      }}
      onHowToClose={() => {
        setHowToOpen(false);
      }}
      onImpostorsChange={setImpostors}
      voteSeconds={voteSeconds}
      onVoteSecondsChange={setVoteSeconds}
      categories={categories}
      chosenCategories={chosenCategories}
      topicsOpen={topicsOpen}
      onTopicsOpen={() => {
        setTopicsOpen(true);
      }}
      onTopicsClose={() => {
        setTopicsOpen(false);
      }}
      onCategoriesChange={setChosenCategories}
      rounds={rounds}
      onRoundsChange={setRounds}
      onStart={() => {
        void run(() => {
          switch (snapshot.room.game) {
            case 'impostor':
              return startGame(roomId, {
                impostorCount,
                categories: chosenCategories,
                voteSeconds,
              });
            case 'probable':
              return probableStart(roomId, rounds);
            case 'quien_lo_dijo':
              return quienLoDijoStart(roomId, rounds);
            case 'una_pista':
              return unaPistaStart(roomId, rounds);
            case 'que_prefieres':
              return quePrefieresStart(roomId, rounds);
            case 'palabras_prohibidas':
              return palabrasProhibidasStart(roomId, rounds);
          }
        });
      }}
      onKickRequest={setKickTargetId}
    />,
  );
}
