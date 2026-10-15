import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Dialog } from '@/components/Dialog';
import { OfflineNotice } from '@/components/OfflineNotice';
import { HeaderAside } from '@/components/HeaderAside';
import { PlayerChip } from '@/components/PlayerChip';
import { QrCode } from '@/components/QrCode';
import { Screen } from '@/components/Screen';
import { Stepper } from '@/components/Stepper';
import { WaitingBox } from '@/components/WaitingBox';
import { configProblem, MIN_LUNA_PLAYERS, type LunaConfig } from '@/games/luna-llena/composition';
import { LunaSettings } from '@/games/luna-llena/LunaSettings';
import type { AvatarId } from '@/lib/avatars';
import { copy } from '@/lib/copy';
import { impostorLimits } from '@/games/impostor/impostors';
import { isRoundGame, ROUND_OPTIONS } from '@/lib/rounds';
import type { ShareOutcome } from '@/lib/share';
import type { RoomPlayer, Snapshot } from '@/lib/snapshot';
import { AvatarPicker } from './AvatarPicker';
import { HowToPlayDialog } from './HowToPlayDialog';
import { KickableChip } from './KickableChip';

export const MAX_PLAYERS = 16;
/** Todos los juegos piden al menos 3 jugadores (docs/JUEGOS.md §1), salvo El lobo, que pide 4. */
export const MIN_PLAYERS = 3;

type LobbyScreenProps = {
  snapshot: Snapshot;
  impostors: number;
  busy: boolean;
  error?: string;
  /** Sin conexión: se avisa y se sigue mostrando la última foto. */
  offline: boolean;
  onLeaveRequest: () => void;
  /** Enlace completo a la sala, para el QR y para compartir. */
  roomUrl: string;
  qrOpen: boolean;
  /** Resultado del último intento de compartir el enlace. */
  shareOutcome: ShareOutcome | null;
  onShare: () => void;
  onShowQr: () => void;
  onCloseQr: () => void;
  howToOpen: boolean;
  avatarOpen: boolean;
  onAvatarOpen: () => void;
  onAvatarClose: () => void;
  onAvatarChange: (avatar: AvatarId | null) => void;
  onHowToOpen: () => void;
  onHowToClose: () => void;
  onImpostorsChange: (count: number) => void;
  voteSeconds: number | null;
  onVoteSecondsChange: (seconds: number | null) => void;
  /** Temáticas de El impostor que hay; vacío mientras llegan. */
  categories: readonly string[];
  chosenCategories: readonly string[];
  topicsOpen: boolean;
  onTopicsOpen: () => void;
  onTopicsClose: () => void;
  onCategoriesChange: (chosen: string[]) => void;
  rounds: number;
  onRoundsChange: (rounds: number) => void;
  /** Composición de Luna llena: la recomendada mientras el anfitrión no la cambie. */
  lunaConfig: LunaConfig;
  onLunaConfigChange: (config: LunaConfig) => void;
  onStart: () => void;
  onKickRequest: (userId: string) => void;
  /** El anfitrión abre el selector de juegos desde la píldora del juego. */
  onChangeGame: () => void;
};

export function LobbyScreen({
  snapshot,
  impostors,
  busy,
  error,
  offline,
  onLeaveRequest,
  roomUrl,
  qrOpen,
  shareOutcome,
  onShare,
  onShowQr,
  onCloseQr,
  howToOpen,
  avatarOpen,
  onAvatarOpen,
  onAvatarClose,
  onAvatarChange,
  onHowToOpen,
  onHowToClose,
  onImpostorsChange,
  voteSeconds,
  onVoteSecondsChange,
  categories,
  chosenCategories,
  topicsOpen,
  onTopicsOpen,
  onTopicsClose,
  onCategoriesChange,
  rounds,
  onRoundsChange,
  lunaConfig,
  onLunaConfigChange,
  onStart,
  onKickRequest,
  onChangeGame,
}: LobbyScreenProps) {
  const { players, room, me } = snapshot;
  const hostName = players.find((player) => player.user_id === room.host_id)?.name ?? '';
  const minPlayers = room.game === 'luna_llena' ? MIN_LUNA_PLAYERS : MIN_PLAYERS;
  const missing = Math.max(0, minPlayers - players.length);
  const lunaProblem = room.game === 'luna_llena' ? configProblem(players.length, lunaConfig) : null;
  // Por qué no se puede empezar todavía, si no se puede.
  const startHint =
    missing > 0
      ? copy.lobby.needPlayers(minPlayers, missing)
      : lunaProblem
        ? copy.lunaLlena.lobby.problems[lunaProblem]
        : null;

  return (
    <Screen
      brand={copy.brand}
      aside={
        <HeaderAside
          tone="tomato"
          tilted
          label={copy.games[room.game].name}
          onChange={me.is_host ? onChangeGame : undefined}
          onLeave={onLeaveRequest}
        />
      }
      notice={offline ? <OfflineNotice>{copy.errors.offline}</OfflineNotice> : null}
    >
      <Card>
        <p className="text-label font-bold uppercase tracking-label">{copy.lobby.codeLabel}</p>
        <p className="font-display text-7xl tracking-wide">{room.code}</p>
        <div className="flex gap-3">
          <div className="flex flex-1">
            <Button variant="secondary" fullWidth onClick={onShare}>
              {shareOutcome === 'copied' ? copy.lobby.linkCopied : copy.lobby.copyLink}
            </Button>
          </div>
          <div className="flex flex-1">
            <Button variant="secondary" fullWidth aria-haspopup="dialog" onClick={onShowQr}>
              {copy.lobby.showQr}
            </Button>
          </div>
        </div>
        {shareOutcome === 'failed' ? (
          <p role="alert" className="text-md font-bold">
            {copy.lobby.copyFailed(room.code)}
          </p>
        ) : null}
      </Card>
      <Button variant="accent" fullWidth aria-haspopup="dialog" onClick={onHowToOpen}>
        {copy.howTo.button}
      </Button>

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
              avatar={player.avatar}
              muted={!player.connected}
              detail={playerDetail(player, room.host_id)}
            />
          );
          const kickable = me.is_host && player.user_id !== me.user_id;
          return (
            <li key={player.user_id} className="min-w-0">
              {kickable ? (
                <KickableChip
                  name={player.name}
                  disabled={busy}
                  onKickRequest={() => {
                    onKickRequest(player.user_id);
                  }}
                >
                  {chip}
                </KickableChip>
              ) : player.user_id === me.user_id ? (
                <button
                  type="button"
                  aria-label={copy.avatars.change}
                  aria-haspopup="dialog"
                  disabled={busy}
                  onClick={onAvatarOpen}
                  className="w-full rounded-chip text-left"
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
          <>
            {room.game === 'luna_llena' ? (
              <LunaSettings
                players={players.length}
                config={lunaConfig}
                onChange={onLunaConfigChange}
              />
            ) : isRoundGame(room.game) ? (
              <RoundsPicker value={rounds} onChange={onRoundsChange} />
            ) : (
              <>
                <ImpostorStepper
                  value={impostors}
                  playerCount={players.length}
                  onChange={onImpostorsChange}
                />
                <VoteTimePicker value={voteSeconds} onChange={onVoteSecondsChange} />
                {categories.length > 0 ? (
                  <TopicsRow chosen={chosenCategories} onOpen={onTopicsOpen} />
                ) : null}
              </>
            )}
            {startHint ? (
              <p id="start-hint" className="text-md font-bold">
                {startHint}
              </p>
            ) : null}
            <Button
              fullWidth
              disabled={busy || startHint !== null}
              aria-describedby={startHint ? 'start-hint' : undefined}
              onClick={onStart}
            >
              {copy.lobby.start}
            </Button>
          </>
        ) : (
          <WaitingBox>{copy.lobby.waitingHost(hostName)}</WaitingBox>
        )}
      </div>

      <Dialog
        open={avatarOpen}
        title={copy.avatars.legend}
        closeLabel={copy.avatars.done}
        onClose={onAvatarClose}
      >
        <AvatarPicker
          name={me.name}
          value={players.find((player) => player.user_id === me.user_id)?.avatar ?? null}
          disabled={busy}
          onChange={onAvatarChange}
        />
      </Dialog>

      {/* Montado solo al abrirlo: cerrado, su título repetiría el nombre del juego en la página. */}
      {howToOpen ? <HowToPlayDialog open game={room.game} onClose={onHowToClose} /> : null}

      <Dialog
        open={topicsOpen}
        title={copy.lobby.topics}
        closeLabel={copy.lobby.topicsDone}
        onClose={onTopicsClose}
      >
        <TopicsPicker
          categories={categories}
          chosen={chosenCategories}
          onChange={onCategoriesChange}
        />
      </Dialog>

      <Dialog
        open={qrOpen}
        title={copy.lobby.qrTitle}
        closeLabel={copy.lobby.close}
        onClose={onCloseQr}
      >
        <QrCode value={roomUrl} label={copy.lobby.qrLabel(room.code)} />
        <p className="text-center font-display text-5xl tracking-wide">{room.code}</p>
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
    <Stepper
      id="impostor-count"
      label={copy.lobby.impostors}
      value={value}
      min={min}
      max={max}
      fewerLabel={copy.lobby.fewerImpostors}
      moreLabel={copy.lobby.moreImpostors}
      onChange={onChange}
    />
  );
}

const VOTE_TIME_OPTIONS = [null, 30, 60, 90] as const;

function VoteTimePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (seconds: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-chip border-3 border-ink bg-paper px-3.5 py-2.5">
      <p className="text-base font-bold" id="vote-time-label">
        {copy.lobby.voteTime}
      </p>
      <div role="group" aria-labelledby="vote-time-label" className="grid grid-cols-4 gap-2">
        {VOTE_TIME_OPTIONS.map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-label={copy.lobby.voteTimeLabel(option)}
            aria-pressed={option === value}
            onClick={() => {
              onChange(option);
            }}
            className={`flex h-11 items-center justify-center rounded-control border-3 border-ink font-display text-lg ${
              option === value ? 'bg-ink text-paper' : 'bg-paper'
            }`}
          >
            {copy.lobby.voteTimeOption(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function TopicsRow({ chosen, onOpen }: { chosen: readonly string[]; onOpen: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-chip border-3 border-ink bg-paper px-3.5 py-2">
      <p className="flex min-w-0 flex-col">
        <span className="text-base font-bold">{copy.lobby.topics}</span>
        <span className="truncate text-sm font-medium">{copy.lobby.topicsSummary(chosen)}</span>
      </p>
      <button
        type="button"
        aria-label={copy.lobby.topicsChooseLabel}
        aria-haspopup="dialog"
        onClick={onOpen}
        className="h-11 shrink-0 rounded-control border-3 border-ink bg-paper px-4 text-md font-bold"
      >
        {copy.lobby.topicsChoose}
      </button>
    </div>
  );
}

/** Una ficha por temática; marcar ninguna es lo mismo que marcarlas todas. */
function TopicsPicker({
  categories,
  chosen,
  onChange,
}: {
  categories: readonly string[];
  chosen: readonly string[];
  onChange: (chosen: string[]) => void;
}) {
  const toggle = (category: string) => {
    onChange(
      chosen.includes(category)
        ? chosen.filter((item) => item !== category)
        : categories.filter((item) => item === category || chosen.includes(item)),
    );
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-md font-medium">{copy.lobby.topicsHint}</p>
      <ul className="flex flex-wrap gap-2">
        <li>
          <TopicChip
            label={copy.lobby.topicsAll}
            pressed={chosen.length === 0}
            onClick={() => {
              onChange([]);
            }}
          />
        </li>
        {categories.map((category) => (
          <li key={category}>
            <TopicChip
              label={category}
              pressed={chosen.includes(category)}
              onClick={() => {
                toggle(category);
              }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopicChip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-full border-3 border-ink px-3.5 text-md font-bold ${
        pressed ? 'bg-ink text-paper' : 'bg-paper'
      }`}
    >
      {label}
    </button>
  );
}

function RoundsPicker({ value, onChange }: { value: number; onChange: (rounds: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-chip border-3 border-ink bg-paper px-3.5 py-2">
      <p className="text-base font-bold" id="rounds-label">
        {copy.lobby.rounds}
      </p>
      <div role="group" aria-labelledby="rounds-label" className="flex items-center gap-2">
        {ROUND_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-label={copy.lobby.roundsOption(option)}
            aria-pressed={option === value}
            onClick={() => {
              onChange(option);
            }}
            className={`flex h-11 min-w-11 items-center justify-center rounded-control border-3 border-ink px-2 font-display text-lg ${
              option === value ? 'bg-ink text-paper' : 'bg-paper'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
