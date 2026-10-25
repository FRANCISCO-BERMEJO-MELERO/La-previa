import type { ReactNode } from 'react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Pill } from '@/components/Pill';
import { WaitingBox } from '@/components/WaitingBox';
import { copy } from '@/lib/copy';
import { fitDisplay } from '@/lib/fit-text';
import type { DadosSideState } from '@/lib/snapshot';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { Die, EmptySlot } from './Die';
import { dieTone, type DadosMember, type TurnStep } from './game-view';

/** Un bando tal como se pinta: su rótulo, quién lo forma y su estado. */
export type SideView = {
  label: string;
  regions: { board: string; scores: string };
  members: DadosMember[];
  state: DadosSideState;
};

const SLOTS = [0, 1, 2] as const;

function SideRow({ side }: { side: SideView }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex shrink-0 -space-x-3">
        {side.members.map((member) => (
          <Avatar
            key={member.userId}
            name={member.name}
            joinIndex={member.joinIndex}
            avatar={member.avatar}
            dashed={member.away}
          />
        ))}
      </span>
      <span aria-hidden="true" className="min-w-0 flex-1 truncate text-base font-bold">
        {side.label}
      </span>
      <span aria-hidden="true" className="shrink-0 font-display text-display-2xs">
        {side.state.total}
      </span>
      <span className="sr-only">{copy.dados.total(side.label, side.state.total)}</span>
    </div>
  );
}

function ColumnDice({ column, toCenter }: { column: readonly number[]; toCenter: 'up' | 'down' }) {
  return (
    <span
      className={`flex items-center gap-2 ${toCenter === 'up' ? 'flex-col-reverse' : 'flex-col'}`}
    >
      {SLOTS.map((slot) => {
        const value = column[slot];
        return value === undefined ? (
          <EmptySlot key={slot} />
        ) : (
          <Die key={slot} value={value} tone={dieTone(column, value)} />
        );
      })}
    </span>
  );
}

type BoardProps = {
  side: SideView;
  /** Hacia dónde se apilan los dados: siempre hacia el centro de la pantalla. */
  toCenter: 'up' | 'down';
  /** Solo si te toca: cada columna es un botón. */
  onPlace?: (column: number) => void;
  busy?: boolean;
};

function Board({ side, toCenter, onPlace, busy = false }: BoardProps) {
  const shadow = toCenter === 'up' ? 'shadow-hard' : '';
  return (
    <section
      aria-label={side.regions.board}
      className={`grid grid-cols-3 gap-2 rounded-card border-3 border-ink bg-paper p-3 ${shadow}`}
    >
      {side.state.board.map((column, index) => {
        const dice = <ColumnDice column={column} toCenter={toCenter} />;
        if (!onPlace) {
          return (
            <div
              key={index}
              className="flex justify-center rounded-chip border-3 border-transparent p-1.5"
            >
              {dice}
            </div>
          );
        }
        const full = column.length >= 3;
        return (
          <button
            key={index}
            type="button"
            aria-label={copy.dados.place(index + 1)}
            disabled={full || busy}
            onClick={() => {
              onPlace(index);
            }}
            className={`flex justify-center rounded-chip border-3 border-ink p-1.5 ${full ? 'border-dashed bg-paper' : 'bg-field'}`}
          >
            {dice}
          </button>
        );
      })}
    </section>
  );
}

function ColumnScores({ side, tone }: { side: SideView; tone: 'ground-soft' | 'paper' }) {
  return (
    <ul aria-label={side.regions.scores} className="grid grid-cols-3 gap-2 px-3.75">
      {side.state.column_scores.map((points, index) => (
        <li
          key={index}
          className={`rounded-full border-3 border-ink py-0.5 text-center font-display text-md ${tone === 'paper' ? 'bg-paper' : 'bg-ground-soft'}`}
        >
          <span aria-hidden="true">{points}</span>
          <span className="sr-only">{copy.dados.column(index + 1, points)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Te toca: el dado pendiente, grande. */
export function MyTurnCard({ value }: { value: number }) {
  return (
    <Card variant="hero" tone="tomato" tilt="left">
      <div className="flex items-center gap-4">
        <Die value={value} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-title uppercase">{copy.dados.myTurn}</h2>
          <p className="text-md font-bold">{copy.dados.myTurnText(value)}</p>
        </div>
      </div>
    </Card>
  );
}

function TurnOrder({ steps }: { steps: TurnStep[] }) {
  return (
    <ol aria-label={copy.dados.turnOrder} className="flex flex-wrap items-center gap-1.5">
      {steps.map((step, index) => (
        <li key={step.userId} className="flex min-w-0 items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden="true" className="font-bold">
              {copy.dados.arrow}
            </span>
          ) : null}
          <span
            aria-current={step.current ? 'step' : undefined}
            className={`max-w-full truncate rounded-full border-3 border-ink px-2.5 py-0.5 text-label font-bold ${step.current ? 'bg-sky' : 'border-dashed'}`}
          >
            {step.name}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** No te toca: quién decide, el dado que tiene y, en 2 contra 2, el orden de turnos. */
export function TurnWaitBox({
  text,
  value,
  steps,
  kick,
}: {
  text: string;
  value: number | null;
  steps: TurnStep[] | null;
  /** Para el anfitrión, si quien tiene el turno se ha desconectado. */
  kick?: { name: string; busy: boolean; onRequest: () => void };
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-button border-3 border-dashed border-ink px-4 py-3"
    >
      <div className="flex items-center gap-3">
        {value === null ? null : <Die value={value} />}
        <p className="min-w-0 text-base font-bold">{text}</p>
      </div>
      {steps ? <TurnOrder steps={steps} /> : null}
      {kick ? (
        <Button
          variant="secondary"
          fullWidth
          aria-haspopup="dialog"
          disabled={kick.busy}
          onClick={kick.onRequest}
        >
          {copy.lobby.kick(kick.name)}
        </Button>
      ) : null}
    </div>
  );
}

type PlayScreenProps = GameScreenProps & {
  top: SideView;
  bottom: SideView;
  onPlace?: (column: number) => void;
  busy: boolean;
  error?: string;
};

/** La mesa: rival arriba, bando propio abajo y, entre los dos, los puntos de cada columna. */
export function PlayScreen({ top, bottom, onPlace, busy, error, ...chrome }: PlayScreenProps) {
  return (
    <GameScreen {...chrome}>
      <div className="flex flex-col gap-3">
        <SideRow side={top} />
        <Board side={top} toCenter="down" />
        <ColumnScores side={top} tone="ground-soft" />
        <ColumnScores side={bottom} tone="paper" />
        <Board side={bottom} toCenter="up" onPlace={onPlace} busy={busy} />
        <SideRow side={bottom} />
      </div>
      {error ? (
        <p role="alert" className="text-md font-bold">
          {error}
        </p>
      ) : null}
    </GameScreen>
  );
}

function SideResult({ side, winner }: { side: SideView; winner: boolean }) {
  return (
    <li className="flex flex-col gap-2.5 rounded-card border-3 border-ink bg-paper px-3.5 py-3">
      <div className="flex items-center gap-2">
        {winner ? <Pill tone="lime">{copy.dados.result.winner}</Pill> : null}
        <span className="min-w-0 flex-1 truncate text-base font-bold">{side.label}</span>
        <span className="shrink-0 font-display text-display-2xs">{side.state.total}</span>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {side.state.column_scores.map((points, index) => (
          <li
            key={index}
            className="rounded-full border-3 border-ink py-0.5 text-center font-display text-md"
          >
            <span aria-hidden="true">{points}</span>
            <span className="sr-only">{copy.dados.column(index + 1, points)}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

type ResultScreenProps = GameScreenProps & {
  title: string;
  summary: string;
  /** El ganador primero; en empate, A y B. */
  sides: { side: SideView; winner: boolean }[];
};

export function ResultScreen({ title, summary, sides, ...chrome }: ResultScreenProps) {
  return (
    <GameScreen {...chrome}>
      <Card variant="dark">
        <Pill tone="lime" onDark>
          {copy.dados.result.finished}
        </Pill>
        <h1
          className={`font-display text-ground uppercase ${fitDisplay(title, 'text-display-sm')}`}
        >
          {title}
        </h1>
        <p className="text-lead font-medium">{summary}</p>
      </Card>
      <ul className="flex flex-col gap-2.5">
        {sides.map(({ side, winner }) => (
          <SideResult key={side.state.side} side={side} winner={winner} />
        ))}
      </ul>
    </GameScreen>
  );
}

/** Pie del resultado: el anfitrión elige si se juega otra; los demás esperan. */
export function ResultControls({
  isHost,
  waiting,
  busy,
  error,
  onPlayAgain,
  onChangeGame,
}: {
  isHost: boolean;
  waiting: string;
  busy: boolean;
  error?: string;
  onPlayAgain: () => void;
  onChangeGame: () => void;
}): ReactNode {
  if (!isHost) return <WaitingBox>{waiting}</WaitingBox>;
  return (
    <>
      {error ? (
        <p role="alert" className="text-md font-bold">
          {error}
        </p>
      ) : null}
      <Button variant="accent" fullWidth disabled={busy} onClick={onChangeGame}>
        {copy.result.changeGame}
      </Button>
      <Button fullWidth disabled={busy} onClick={onPlayAgain}>
        {copy.result.playAgain}
      </Button>
    </>
  );
}
