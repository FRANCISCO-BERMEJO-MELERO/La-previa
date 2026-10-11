'use client';

import type { HeaderTone } from '@/components/HeaderAside';
import { useState, type ReactNode } from 'react';
import { WaitingBox } from '@/components/WaitingBox';
import { activePlayers, hostName, isLastRound } from '@/games/rounds/game-view';
import { restartOrLobby } from '@/games/rounds/restart';
import { RoundControls } from '@/games/rounds/RoundControls';
import { WaitScreen } from '@/games/rounds/WaitScreen';
import {
  unaPistaClue,
  unaPistaCloseWriting,
  unaPistaMark,
  unaPistaNext,
  unaPistaShowClues,
  unaPistaStart,
  unaPistaToggleClue,
  type ActionResult,
} from '@/lib/actions';
import { copy } from '@/lib/copy';
import type { Snapshot, UnaPistaGameState } from '@/lib/snapshot';
import { LateScreen } from '@/screens/LateScreen';
import { clueRows, nameOf } from './game-view';
import {
  ClueScreen,
  GuesserScreen,
  GuessScreen,
  GuessWaitScreen,
  MarkControls,
  ResultScreen,
  RevealScreen,
  ReviewScreen,
} from './screens';
import { viewFor } from './view';

type UnaPistaGameProps = {
  snapshot: Snapshot;
  game: UnaPistaGameState;
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

/** Partida de Una sola pista: acciones del juego y pantalla según la foto. */
export function UnaPistaGame({
  snapshot,
  game,
  pill,
  notice,
  busy,
  error,
  run,
  onKickRequest,
  onChangeGame,
}: UnaPistaGameProps) {
  const [clue, setClue] = useState('');
  const roomId = snapshot.room.id;
  const myId = snapshot.me.user_id;
  const isHost = snapshot.me.is_host;
  const isArbiter = game.arbiter_id === myId;
  const arbiter = nameOf(snapshot, game, game.arbiter_id);
  const active = activePlayers(snapshot, game);
  const clues = clueRows(snapshot, game);
  const word = game.word ?? '';
  const category = game.category ?? '';
  const roundPill = pill(copy.rounds.pill(game.round, game.total_rounds), 'lime');

  // El anfitrión empieza y cierra la partida; el árbitro lleva cada ronda.
  const controls = (
    <RoundControls
      inCharge={game.phase === 'finished' ? isHost : isArbiter}
      waiting={
        game.phase === 'writing'
          ? copy.unaPista.waitingWriting(arbiter)
          : game.phase === 'review'
            ? copy.unaPista.waitingShow(arbiter)
            : game.phase === 'reveal'
              ? copy.unaPista.waitingNext(arbiter)
              : copy.result.waitingHost(hostName(snapshot))
      }
      finished={game.phase === 'finished'}
      advanceLabel={
        game.phase === 'writing'
          ? copy.unaPista.closeWriting
          : game.phase === 'review'
            ? copy.unaPista.showClues
            : isLastRound(game)
              ? copy.reveal.seeResult
              : copy.rounds.next
      }
      busy={busy}
      error={error}
      onAdvance={() => {
        void run(() =>
          game.phase === 'writing'
            ? unaPistaCloseWriting(roomId)
            : game.phase === 'review'
              ? unaPistaShowClues(roomId)
              : unaPistaNext(roomId),
        );
      }}
      onPlayAgain={() => {
        void run(() => restartOrLobby(roomId, () => unaPistaStart(roomId, game.total_rounds)));
      }}
      onChangeGame={onChangeGame}
    />
  );

  switch (viewFor(game, myId)) {
    case 'late':
      return (
        <LateScreen
          aside={roundPill}
          notice={notice}
          footer={isArbiter ? controls : <WaitingBox>{copy.late.waitingRound}</WaitingBox>}
          text={copy.late.textRound}
          myName={snapshot.me.name}
          playing={active.map((player) => ({ ...player, muted: !player.connected }))}
        />
      );
    case 'guesser_wait':
      return (
        <GuesserScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          reviewing={game.phase === 'review'}
        />
      );
    case 'clue':
      return (
        <ClueScreen
          aside={roundPill}
          notice={notice}
          word={word}
          category={category}
          value={clue}
          busy={busy}
          error={error}
          onChange={setClue}
          onSubmit={() => {
            if (clue.trim() === '') return;
            void run(() => unaPistaClue(roomId, clue)).then((ok) => {
              if (ok) setClue('');
            });
          }}
        />
      );
    case 'clue_wait': {
      const givers = active.filter((player) => player.userId !== game.guesser_id);
      return (
        <WaitScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          label={copy.unaPista.cluesGiven}
          done={givers.filter((player) => player.hasResponded).length}
          total={givers.length}
          responders={givers}
          doneDetail={copy.unaPista.clueGivenDetail}
          hint={isArbiter ? copy.unaPista.closeWritingHint : undefined}
          busy={busy}
          onKickRequest={isHost ? onKickRequest : undefined}
        >
          <p className="text-md font-medium">
            {copy.unaPista.guesserPill(nameOf(snapshot, game, game.guesser_id))}
          </p>
          {game.my.clue ? (
            <p className="text-base font-bold">{copy.unaPista.mine(game.my.clue)}</p>
          ) : null}
        </WaitScreen>
      );
    }
    case 'review':
      return (
        <ReviewScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          clues={clues}
          busy={busy}
          onToggle={
            game.my.clue === null
              ? undefined
              : (userId) => {
                  void run(() => unaPistaToggleClue(roomId, userId));
                }
          }
        />
      );
    case 'guess':
      return (
        <GuessScreen
          aside={roundPill}
          notice={notice}
          footer={<WaitingBox>{copy.unaPista.waitingMark(arbiter)}</WaitingBox>}
          clues={clues}
        />
      );
    case 'guess_wait':
      return (
        <GuessWaitScreen
          aside={roundPill}
          notice={notice}
          footer={
            <MarkControls
              isArbiter={isArbiter}
              waiting={copy.unaPista.waitingGuess(arbiter)}
              busy={busy}
              error={error}
              onMark={(result) => {
                void run(() => unaPistaMark(roomId, result));
              }}
            />
          }
          word={word}
          category={category}
          clues={clues.filter((row) => !row.cancelled)}
        />
      );
    case 'reveal':
      return (
        <RevealScreen
          aside={roundPill}
          notice={notice}
          footer={controls}
          word={word}
          result={game.result ?? 'pass'}
          clues={clues}
        />
      );
    case 'result':
      return (
        <ResultScreen
          aside={pill(copy.result.finished)}
          notice={notice}
          footer={controls}
          score={game.team_score}
          total={game.total_rounds}
        />
      );
  }
}
