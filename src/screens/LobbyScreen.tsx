import type { ReactNode } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Dialog } from '@/components/Dialog';
import { Pill } from '@/components/Pill';
import { PlayerChip } from '@/components/PlayerChip';
import { Screen } from '@/components/Screen';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import { impostorLimits } from '@/lib/impostors';
import type { RoomPlayer, Snapshot } from '@/lib/snapshot';

export const MAX_PLAYERS = 16;

type LobbyScreenProps = {
  snapshot: Snapshot;
  impostors: number;
  busy: boolean;
  error?: string;
  /** Jugador al que el anfitrión quiere echar; abre la confirmación. */
  kickTarget: RoomPlayer | null;
  onImpostorsChange: (count: number) => void;
  onKickRequest: (userId: string) => void;
  onKickCancel: () => void;
  onKickConfirm: () => void;
};

export function LobbyScreen({
  snapshot,
  impostors,
  busy,
  error,
  kickTarget,
  onImpostorsChange,
  onKickRequest,
  onKickCancel,
  onKickConfirm,
}: LobbyScreenProps) {
  const { players, room, me } = snapshot;
  const hostName = players.find((player) => player.user_id === room.host_id)?.name ?? '';

  return (
    <Screen
      brand={copy.brand}
      aside={
        <Pill tone="tomato" tilted>
          {copy.games.impostor.name}
        </Pill>
      }
    >
      <Card>
        <p className="text-label font-bold uppercase tracking-label">{copy.lobby.codeLabel}</p>
        <p className="font-display text-7xl tracking-wide">{room.code}</p>
      </Card>

      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-lg uppercase">{copy.lobby.players}</h1>
        <p className="text-sm font-bold">{copy.lobby.count(players.length, MAX_PLAYERS)}</p>
      </div>
      <ul className="grid grid-cols-2 gap-3">
        {players.map((player, index) => {
          const chip = (
            <PlayerChip
              name={player.name}
              joinIndex={index}
              muted={!player.connected}
              detail={playerDetail(player, room.host_id)}
            />
          );
          const kickable = me.is_host && player.user_id !== me.user_id;
          return (
            <li key={player.user_id} className="min-w-0">
              {kickable ? (
                // El anfitrión toca la ficha para echar: un botón aparte no cabe a 360 px.
                <button
                  type="button"
                  aria-label={copy.lobby.kick(player.name)}
                  aria-haspopup="dialog"
                  disabled={busy}
                  onClick={() => {
                    onKickRequest(player.user_id);
                  }}
                  className="block w-full rounded-chip text-left"
                >
                  {chip}
                </button>
              ) : (
                chip
              )}
            </li>
          );
        })}
      </ul>

      {error ? (
        <p role="alert" className="text-md font-bold">
          {error}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-5">
        {me.is_host ? (
          <ImpostorStepper
            value={impostors}
            playerCount={players.length}
            onChange={onImpostorsChange}
          />
        ) : (
          <WaitingBox>{copy.lobby.waitingHost(hostName)}</WaitingBox>
        )}
      </div>

      <Dialog
        open={kickTarget !== null}
        title={kickTarget ? copy.lobby.kickTitle(kickTarget.name) : ''}
        closeLabel={copy.room.cancel}
        onClose={onKickCancel}
      >
        <p className="text-base">{copy.lobby.kickText}</p>
        <Button fullWidth disabled={busy} onClick={onKickConfirm}>
          {copy.lobby.kickConfirm}
        </Button>
      </Dialog>
    </Screen>
  );
}

function playerDetail(player: RoomPlayer, hostId: string): string | undefined {
  if (player.user_id === hostId) return copy.lobby.host;
  return player.connected ? undefined : copy.lobby.disconnected;
}

function ImpostorStepper({
  value,
  playerCount,
  onChange,
}: {
  value: number;
  playerCount: number;
  onChange: (count: number) => void;
}) {
  const { min, max } = impostorLimits(playerCount);
  return (
    <div className="flex items-center justify-between rounded-chip border-3 border-ink bg-paper px-3.5 py-2">
      <p className="text-base font-bold" id="impostor-count-label">
        {copy.lobby.impostors}
      </p>
      <div className="flex items-center gap-3.5">
        <StepButton
          label={copy.lobby.fewerImpostors}
          disabled={value <= min}
          onClick={() => {
            onChange(value - 1);
          }}
        >
          {copy.lobby.minus}
        </StepButton>
        <output aria-labelledby="impostor-count-label" className="font-display text-title">
          {value}
        </output>
        <StepButton
          label={copy.lobby.moreImpostors}
          disabled={value >= max}
          onClick={() => {
            onChange(value + 1);
          }}
        >
          {copy.lobby.plus}
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-control border-3 border-ink bg-paper text-2xl font-bold disabled:border-dashed disabled:bg-ground-soft"
    >
      {children}
    </button>
  );
}
