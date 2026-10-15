'use client';

import type { HeaderTone } from '@/components/HeaderAside';
import { useState, type ReactNode } from 'react';
import { WaitingBox } from '@/components/WaitingBox';
import {
  activePlayers,
  hostName,
  isLastRound,
  leaders,
  rankingRows,
} from '@/games/rounds/game-view';
import { restartOrLobby } from '@/games/rounds/restart';
import { ResultScreen } from '@/games/rounds/ResultScreen';
import { RoundControls } from '@/games/rounds/RoundControls';
import { WaitScreen } from '@/games/rounds/WaitScreen';
import {
  quePrefieresChoose,
  quePrefieresClose,
  quePrefieresNext,
  quePrefieresStart,
  type ActionResult,
} from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { QuePrefieresGameState, QuePrefieresOption, Snapshot } from '@/lib/snapshot';
import { LateScreen } from '@/screens/LateScreen';
import { optionRows, optionText } from './game-view';
import { ChooseScreen, RevealScreen } from './screens';
import { viewFor } from './view';

type QuePrefieresGameProps = {
  snapshot: Snapshot;
  game: QuePrefieresGameState;
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

/** Partida de ¿Qué prefieres?: acciones del juego y pantalla según la foto. */
export function QuePrefieresGame({
  snapshot,
  game,
  pill,
  notice,
  busy,
  error,
  run,
  onKickRequest,
  onChangeGame,
}: QuePrefieresGameProps) {
  const [selected, setSelected] = useState<QuePrefieresOption | null>(null);
  const roomId = snapshot.room.id;
  const isHost = snapshot.me.is_host;
  const host = hostName(snapshot);
  const active = activePlayers(snapshot, game);
  const options = optionRows(snapshot, game);
  const roundPill = pill(copy.rounds.pill(game.round, game.total_rounds), 'orange');
  const controls = (
    <RoundControls
      inCharge={isHost}
      waiting={
        game.phase === 'voting'
          ? copy.quePrefieres.waitingClose(host)
          : game.phase === 'reveal'
            ? copy.reveal.waitingHost(host)
            : copy.result.waitingHost(host)
      }
      finished={game.phase === 'finished'}
      advanceLabel={
        game.phase === 'voting'
          ? copy.quePrefieres.close
          : isLastRound(game)
            ? copy.reveal.seeResult
            : copy.rounds.next
      }
      busy={busy}
      error={error}
      onAdvance={() => {
        void run(() =>
          game.phase === 'voting' ? quePrefieresClose(roomId) : quePrefieresNext(roomId),
        );
      }}
      onPlayAgain={() => {
        void run(() => restartOrLobby(roomId, () => quePrefieresStart(roomId, game.total_rounds)));
      }}
      onChangeGame={onChangeGame}
    />
  );

  switch (viewFor(game)) {
    case 'late':
      return (
        <LateScreen
          aside={roundPill}
          notice={notice}
          footer={isHost ? controls : <WaitingBox>{copy.late.waitingRound}</WaitingBox>}
          text={copy.late.textRound}
          myName={snapshot.me.name}
          playing={active.map((player) => ({ ...player, muted: !player.connected }))}
        />
      );
    case 'choose':
      return (
        <ChooseScreen
          aside={roundPill}
          notice={notice}
          options={options}
          selected={selected}
          busy={busy}
          error={error}
          onSelect={setSelected}
          onChoose={() => {
            if (!selected) return;
            void run(() => quePrefieresChoose(roomId, selected)).then((ok) => {
              if (ok) setSelected(null);
            });
          }}
        />
      );
    case 'choose_wait':
      return (
        <WaitScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          label={copy.quePrefieres.chosen}
          done={active.filter((player) => player.hasResponded).length}
          total={active.length}
          responders={active}
          doneDetail={copy.quePrefieres.chosenDetail}
          hint={isHost ? copy.quePrefieres.closeHint : undefined}
          busy={busy}
          onKickRequest={isHost ? onKickRequest : undefined}
        >
          <p className="text-md font-medium">{copy.quePrefieres.question}</p>
          {game.my.choice ? (
            <p className="text-base font-bold">
              {copy.quePrefieres.mine(optionText(game, game.my.choice))}
            </p>
          ) : null}
        </WaitScreen>
      );
    case 'reveal':
      return <RevealScreen aside={roundPill} notice={notice} footer={controls} options={options} />;
    case 'result': {
      const ranking = rankingRows(snapshot, game);
      return (
        <ResultScreen
          aside={pill(copy.result.finished)}
          notice={notice}
          footer={controls}
          pill={copy.quePrefieres.resultPill}
          accent="orange"
          leaders={leaders(ranking)}
          ranking={ranking}
        />
      );
    }
  }
}
