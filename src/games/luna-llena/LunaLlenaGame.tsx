'use client';

import type { HeaderTone } from '@/components/HeaderAside';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import { WaitingBox } from '@/components/WaitingBox';
import { restartOrLobby } from '@/games/rounds/restart';
import {
  lunaLlenaCloseNight,
  lunaLlenaCloseVote,
  lunaLlenaContinue,
  lunaLlenaHunterShot,
  lunaLlenaNightAction,
  lunaLlenaSkipHunter,
  lunaLlenaStart,
  lunaLlenaVote,
  lunaLlenaWitchAction,
  type ActionResult,
} from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { LunaLlenaGameState, Snapshot } from '@/lib/snapshot';
import { LateScreen } from '@/screens/LateScreen';
import { CardPeek } from './CardPeek';
import { DawnScreen } from './DawnScreen';
import { HunterScreen } from './HunterScreen';
import { DayScreen, DefenseScreen, VoteScreen, WaitScreen } from './DayScreens';
import {
  actionLines,
  liveMayorId,
  lunaPlayers,
  nameOf,
  namesOf,
  nightCandidates,
  nightMode,
  packMarks,
  hasWon,
  pairNames,
  pendingCount,
  realDeaths,
  voteGroups,
  roleRows,
  witchReportLines,
  wolfVictimLine,
  type LunaPlayer,
  type NightMode,
} from './game-view';
import { narrationLines } from './narration';
import { narratorAction, type NarratorStep } from './narrator';
import { NarratorBox } from './NarratorBox';
import { NightScreen } from './NightScreen';
import { ResultScreen } from './ResultScreen';
import { RolesScreen } from './RolesScreen';
import { SpectatorScreen } from './SpectatorScreen';
import { ExecutionScreen } from './ExecutionScreen';
import { viewFor } from './view';

type LunaLlenaGameProps = {
  snapshot: Snapshot;
  game: LunaLlenaGameState;
  /** Píldora de la cabecera que abre el diálogo de salir. */
  pill: (label: string, tone?: HeaderTone) => ReactNode;
  notice: ReactNode;
  busy: boolean;
  error?: string;
  /** Ejecuta una acción y aplica la foto que devuelve; resuelve si ha ido bien. */
  run: (action: () => Promise<ActionResult<Snapshot>>) => Promise<boolean>;
  onChangeGame: () => void;
};

function stepAction(step: NarratorStep, roomId: string): Promise<ActionResult<Snapshot>> {
  switch (step) {
    case 'continue':
      return lunaLlenaContinue(roomId);
    case 'close_night':
      return lunaLlenaCloseNight(roomId);
    case 'close_vote':
      return lunaLlenaCloseVote(roomId);
    case 'skip_hunter':
      return lunaLlenaSkipHunter(roomId);
  }
}

const texts = copy.lunaLlena;

/** Partida de Luna llena: acciones del juego y pantalla según la foto. */
export function LunaLlenaGame({
  snapshot,
  game,
  pill,
  notice,
  busy,
  error,
  run,
  onChangeGame,
}: LunaLlenaGameProps) {
  // Lo elegido vale solo para el momento en que se eligió: al cambiar de fase se olvida.
  const moment = `${game.phase}-${String(game.night)}-${String(game.day)}`;
  // `life` es la poción de vida que la bruja ha marcado y aún no ha enviado.
  const [choice, setChoice] = useState<{ moment: string; ids: string[]; life: boolean }>({
    moment,
    ids: [],
    life: false,
  });
  const chosen = choice.moment === moment ? choice.ids : [];
  const lifeChosen = choice.moment === moment && choice.life;
  const roomId = snapshot.room.id;
  const myId = snapshot.me.user_id;
  const players = lunaPlayers(snapshot, game);
  const host = players.find((player) => player.userId === snapshot.room.host_id)?.name ?? '';
  const pack = namesOf(players, game.my.fellow_wolves);
  const action = narratorAction(game);
  const mayorId = liveMayorId(game, players);
  // El error del narrador sale en su caja; el de los demás, en su pantalla.
  const playerError = snapshot.me.is_host ? undefined : error;

  const choose = (ids: string[], life = lifeChosen) => {
    setChoice({ moment, ids, life });
  };

  const narrator = snapshot.me.is_host ? (
    <NarratorBox
      lines={narrationLines(game.narration)}
      actionLabel={action?.label ?? null}
      busy={busy}
      error={error}
      onAction={() => {
        if (!action) return;
        void run(() => stepAction(action.step, roomId));
      }}
    />
  ) : (
    <WaitingBox>{waitingText(game, host)}</WaitingBox>
  );
  const controls =
    game.phase === 'finished' && snapshot.me.is_host ? (
      <>
        <Button variant="accent" fullWidth disabled={busy} onClick={onChangeGame}>
          {copy.result.changeGame}
        </Button>
        <Button
          fullWidth
          disabled={busy}
          onClick={() => {
            void run(() => restartOrLobby(roomId, () => playAgain(roomId, game.config)));
          }}
        >
          {copy.result.playAgain}
        </Button>
      </>
    ) : null;
  const peek =
    game.my.role && game.my.alive && game.phase !== 'roles' ? (
      <CardPeek role={game.my.role} pack={pack} />
    ) : null;
  const chrome = {
    aside: pill(copy.games.luna_llena.name, 'tomato'),
    notice,
    footer: (
      <>
        {peek}
        {narrator}
        {controls}
      </>
    ),
  };

  switch (viewFor(game)) {
    case 'late':
      return (
        <LateScreen
          {...chrome}
          text={copy.late.text}
          myName={snapshot.me.name}
          playing={players
            .filter((player) => player.alive)
            .map((player) => ({ ...player, muted: !player.connected }))}
        />
      );
    case 'roles':
      return game.my.role ? <RolesScreen {...chrome} role={game.my.role} pack={pack} /> : null;
    case 'night': {
      const mode = nightMode(game);
      const current = game.my.action;
      const witch = mode === 'witch';
      // Un lobo ve marcado a quien ya marcó mientras no elija a otro.
      const selected = chosen.length > 0 || !current?.target_id ? chosen : [current.target_id];
      return (
        <NightScreen
          {...chrome}
          night={game.night}
          mode={mode}
          candidates={nightCandidates(game, players, myId)}
          selected={selected}
          ready={
            // A la bruja le vale no usar nada.
            witch ||
            (mode === 'cupid'
              ? chosen.length === 2
              : chosen.length === 1 && chosen[0] !== current?.target_id)
          }
          onToggle={(userId) => {
            choose(toggleChoice(mode, chosen, userId));
          }}
          onConfirm={() => {
            const [target = null, target2 = null] = chosen;
            if (witch) {
              void run(() => lunaLlenaWitchAction(roomId, lifeChosen, target)).then((ok) => {
                if (ok) choose([], false);
              });
              return;
            }
            if (!target) return;
            void run(() => lunaLlenaNightAction(roomId, target, target2)).then((ok) => {
              if (ok) choose([]);
            });
          }}
          busy={busy}
          error={playerError}
          done={current ? doneText(mode, players, current) : null}
          victimLine={witch ? wolfVictimLine(game, players) : null}
          lifePotion={
            witch
              ? {
                  available: game.my.potions?.life ?? false,
                  active: lifeChosen,
                  onToggle: () => {
                    choose(chosen, !lifeChosen);
                  },
                }
              : null
          }
          marks={
            new Map(
              [...packMarks(game, players)].map(([target, names]) => [
                target,
                copy.lunaLlena.night.marks(names),
              ]),
            )
          }
          seerResults={game.my.seer_results.map((result) =>
            copy.lunaLlena.night.seerResult(
              result.night,
              nameOf(players, result.user_id),
              result.is_wolf,
            ),
          )}
          pending={pendingCount(players)}
        />
      );
    }
    case 'dawn':
      return (
        <DawnScreen
          {...chrome}
          deaths={game.announcement?.deaths ?? []}
          secrets={[
            ...(game.night === 1 ? [loverSecret(game, players)] : []).filter(
              (line) => line !== null,
            ),
            ...witchReportLines(game, players),
          ]}
        />
      );
    case 'mayor':
    case 'voting': {
      const electing = game.phase === 'mayor';
      const target = chosen[0] ?? null;
      const votedFor = game.my.vote?.target_id ?? null;
      return (
        <VoteScreen
          {...chrome}
          pill={electing ? texts.vote.mayorPill : texts.vote.accusePill(game.day)}
          title={electing ? texts.vote.mayorTitle : texts.vote.accuseTitle}
          hint={electing ? texts.vote.mayorHint : texts.vote.accuseHint}
          // Para alcalde vale cualquier vivo; para acusar, cualquiera menos uno mismo.
          candidates={players.filter(
            (player) => player.alive && (electing || player.userId !== myId),
          )}
          mayorId={mayorId}
          selected={target}
          onSelect={(userId) => {
            choose([userId]);
          }}
          onSubmit={() => {
            if (!target) return;
            void run(() => lunaLlenaVote(roomId, target)).then((ok) => {
              if (ok) choose([]);
            });
          }}
          busy={busy}
          error={playerError}
          voted={votedFor ? nameOf(players, votedFor) : null}
          pending={pendingCount(players)}
        />
      );
    }
    case 'day':
      return (
        <DayScreen
          {...chrome}
          day={game.day}
          mayor={mayorId ? nameOf(players, mayorId) : null}
          mayorVotes={voteGroups(game, players, 'mayor')}
        />
      );
    case 'defense':
      return (
        <DefenseScreen
          {...chrome}
          accused={game.accused_id ? nameOf(players, game.accused_id) : null}
          accusedId={game.accused_id}
          isMe={game.accused_id === myId}
          groups={voteGroups(game, players, 'accuse')}
        />
      );
    case 'execution':
      return (
        <ExecutionScreen
          {...chrome}
          deaths={game.announcement?.deaths ?? []}
          groups={voteGroups(game, players, 'accuse')}
          left={game.announcement?.kind === 'left'}
        />
      );
    case 'hunter_shoot': {
      const target = chosen[0] ?? null;
      return (
        <HunterScreen
          {...chrome}
          candidates={players.filter((player) => player.alive)}
          selected={target}
          onSelect={(userId) => {
            choose([userId]);
          }}
          onShoot={() => {
            if (!target) return;
            void run(() => lunaLlenaHunterShot(roomId, target));
          }}
          busy={busy}
          error={playerError}
        />
      );
    }
    case 'hunter_wait':
      return (
        <WaitScreen
          {...chrome}
          text={texts.hunter.waiting(
            players.find((player) => player.role === 'hunter')?.name ?? '',
          )}
        />
      );
    case 'spectator':
      return (
        <SpectatorScreen
          {...chrome}
          rows={roleRows(players, game.spectator?.roles ?? [])}
          lovers={pairNames(players, game.spectator?.lovers ?? null)}
          actions={
            game.phase === 'night' ? actionLines(players, game.spectator?.actions ?? []) : null
          }
          deaths={realDeaths(game)}
          potions={
            game.spectator?.potions
              ? texts.spectator.potions(game.spectator.potions.life, game.spectator.potions.poison)
              : null
          }
        />
      );
    case 'result': {
      const result = game.result;
      return result ? (
        <ResultScreen
          {...chrome}
          aside={pill(copy.result.finished)}
          winner={result.winner}
          won={hasWon(game)}
          rows={roleRows(players, result.roles)}
          lovers={pairNames(players, result.lovers)}
        />
      ) : null;
    }
  }
}

function waitingText(game: LunaLlenaGameState, host: string): string {
  if (game.phase === 'roles') return texts.deal.waiting;
  if (game.phase === 'finished') return copy.result.waitingHost(host);
  return texts.waitingNarrator(host);
}

/** Volver a jugar con la misma composición; si ya no vale para los que quedan, la recomendada. */
async function playAgain(
  roomId: string,
  config: LunaLlenaGameState['config'],
): Promise<ActionResult<Snapshot>> {
  const again = await lunaLlenaStart(roomId, config);
  return !again.ok && again.error === 'invalid_config' ? lunaLlenaStart(roomId, null) : again;
}

/** Cupido elige a dos; los demás, a uno. Tocar a un elegido lo quita. */
function toggleChoice(mode: NightMode, chosen: readonly string[], userId: string): string[] {
  if (chosen.includes(userId)) return chosen.filter((id) => id !== userId);
  if (mode !== 'cupid') return [userId];
  return [...chosen.slice(-1), userId];
}

function doneText(
  mode: NightMode,
  players: readonly LunaPlayer[],
  action: NonNullable<LunaLlenaGameState['my']['action']>,
): string {
  const done = copy.lunaLlena.night.done;
  const target = nameOf(players, action.target_id);
  if (mode === 'cupid') return done.cupid(target, nameOf(players, action.target2_id));
  if (mode === 'witch') {
    return copy.lunaLlena.night.witch.done(
      action.use_life ?? false,
      action.target_id ? target : null,
    );
  }
  return done[mode](target);
}

/** Al amanecer de la primera noche, cada enamorado sabe de quién; Cupido, a quién enlazó. */
function loverSecret(game: LunaLlenaGameState, players: readonly LunaPlayer[]): string | null {
  if (game.my.lover_id) return copy.lunaLlena.dawn.lover(nameOf(players, game.my.lover_id));
  const [a, b] = game.my.chosen_lovers ?? [];
  if (a && b) return copy.lunaLlena.dawn.cupid(nameOf(players, a), nameOf(players, b));
  return null;
}
