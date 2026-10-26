'use client';

import type { ReactNode } from 'react';
import type { HeaderTone } from '@/components/HeaderAside';
import { backToLobby, dadosPlace, dadosStart, type ActionResult } from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { DadosGameState, DadosSideState, Snapshot } from '@/lib/snapshot';
import {
  boardSides,
  resultSummary,
  resultTitle,
  sideLabel,
  sideMembers,
  sideRegions,
  turnName,
  turnSteps,
} from './game-view';
import { MyTurnCard, PlayScreen, ResultControls, ResultScreen, TurnWaitBox } from './screens';
import { viewFor } from './view';

type DadosGameProps = {
  snapshot: Snapshot;
  game: DadosGameState;
  /** Píldora de la cabecera que abre el diálogo de salir. */
  pill: (label: string, tone?: HeaderTone) => ReactNode;
  notice: ReactNode;
  busy: boolean;
  error?: string;
  /** Ejecuta una acción y aplica la foto que devuelve; resuelve si ha ido bien. */
  run: (action: () => Promise<ActionResult<Snapshot>>) => Promise<boolean>;
  onKickRequest: (userId: string) => void;
  onChangeGame: () => void;
};

/** Volver a jugar con los mismos equipos; si falta alguno, a la sala de espera. */
async function playAgain(roomId: string, game: DadosGameState) {
  const [a, b] = game.sides;
  const ids = (side: DadosSideState) => side.members.map((member) => member.user_id);
  const again = await dadosStart(roomId, game.mode, { A: ids(a), B: ids(b) });
  return !again.ok && again.error === 'invalid_teams' ? backToLobby(roomId) : again;
}

/** Partida de A dados: acciones del juego y pantalla según la foto. */
export function DadosGame({
  snapshot,
  game,
  pill,
  notice,
  busy,
  error,
  run,
  onKickRequest,
  onChangeGame,
}: DadosGameProps) {
  const roomId = snapshot.room.id;
  const view = viewFor(game);
  const aside = pill(copy.dados.pill(game.mode), 'orange');
  const toView = (side: DadosSideState) => ({
    label: sideLabel(game, side),
    regions: sideRegions(game, side),
    members: sideMembers(snapshot, side),
    state: side,
  });
  const { top, bottom } = boardSides(game);

  if (view === 'result') {
    const winner = game.result?.winner ?? null;
    const ordered = winner === 'B' ? [game.sides[1], game.sides[0]] : [...game.sides];
    const host = snapshot.players.find((player) => player.user_id === snapshot.room.host_id);
    return (
      <ResultScreen
        aside={aside}
        notice={notice}
        footer={
          <ResultControls
            isHost={snapshot.me.is_host}
            waiting={copy.result.waitingHost(host?.name ?? '')}
            busy={busy}
            error={error}
            onPlayAgain={() => {
              void run(() => playAgain(roomId, game));
            }}
            onChangeGame={onChangeGame}
          />
        }
        title={resultTitle(game)}
        summary={resultSummary(game)}
        sides={ordered.map((side) => ({ side: toView(side), winner: side.side === winner }))}
      />
    );
  }

  const value = game.pending_die;
  const steps = game.mode === '2v2' ? turnSteps(game) : null;
  // Quien tiene el turno, si se ha desconectado: el anfitrión puede echarlo para no quedarse esperando.
  const turnUserId = game.turn?.user_id ?? null;
  const awayTurnId = snapshot.players.some(
    (player) => player.user_id === turnUserId && player.connected,
  )
    ? null
    : turnUserId;
  const footer =
    view === 'my_turn' && value !== null ? (
      <MyTurnCard value={value} />
    ) : (
      <TurnWaitBox
        text={
          view === 'spectator' || value === null
            ? copy.dados.spectatorWaiting(turnName(game))
            : copy.dados.waiting(turnName(game), value)
        }
        value={value}
        steps={steps}
        kick={
          snapshot.me.is_host && awayTurnId !== null
            ? {
                name: turnName(game),
                busy,
                onRequest: () => {
                  onKickRequest(awayTurnId);
                },
              }
            : undefined
        }
      />
    );

  return (
    <PlayScreen
      aside={aside}
      notice={notice}
      footer={footer}
      top={toView(top)}
      bottom={toView(bottom)}
      busy={busy}
      error={error}
      onPlace={
        view === 'my_turn'
          ? (column) => {
              void run(() => dadosPlace(roomId, column));
            }
          : undefined
      }
    />
  );
}
