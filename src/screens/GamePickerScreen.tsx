import type { ReactNode } from 'react';
import { Button } from '@/components/Button';
import { OfflineNotice } from '@/components/OfflineNotice';
import { PillButton } from '@/components/PillButton';
import { Screen } from '@/components/Screen';
import { copy } from '@/lib/copy';
import { gameIds, type GameId } from '@/lib/snapshot';

type GamePickerScreenProps = {
  roomCode: string;
  selected: GameId;
  busy: boolean;
  error?: string;
  offline: boolean;
  onSelect: (game: GameId) => void;
  onOpen: () => void;
  onLeaveRequest: () => void;
};

export function GamePickerScreen({
  roomCode,
  selected,
  busy,
  error,
  offline,
  onSelect,
  onOpen,
  onLeaveRequest,
}: GamePickerScreenProps) {
  return (
    <Screen
      brand={copy.brand}
      aside={
        <PillButton
          label={copy.room.pill(roomCode)}
          hint={copy.room.leave}
          onClick={onLeaveRequest}
        />
      }
      notice={offline ? <OfflineNotice>{copy.errors.offline}</OfflineNotice> : null}
    >
      <h1 className="font-display text-4xl uppercase">{copy.games.title}</h1>
      <ul className="flex flex-col gap-4">
        {gameIds.map((game) => (
          <li key={game}>
            <button
              type="button"
              aria-pressed={game === selected}
              onClick={() => {
                onSelect(game);
              }}
              className={`flex w-full flex-col overflow-hidden rounded-card border-3 border-ink bg-paper text-left ${
                game === selected ? 'shadow-hard' : ''
              }`}
            >
              <GameCover game={game} chosen={game === selected} />
              <span className="flex flex-col gap-1 px-4 py-3.5">
                <span className="font-display text-title uppercase">{copy.games[game].name}</span>
                <span className="text-sm font-medium">{copy.games[game].description}</span>
                <span className="text-label font-bold">{copy.games[game].players}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <h2 className="text-label font-bold uppercase tracking-label">{copy.games.soon}</h2>
      <ul className="grid grid-cols-2 gap-3">
        {copy.games.upcoming.map((title, index) => (
          <li key={title} className="overflow-hidden rounded-chip border-3 border-ink bg-paper">
            <UpcomingCover index={index} />
            <p className="px-2.5 py-2 text-sm font-bold">{title}</p>
          </li>
        ))}
      </ul>
      {error ? (
        <p role="alert" className="text-md font-bold">
          {error}
        </p>
      ) : null}
      <div className="mt-auto flex">
        <Button fullWidth disabled={busy} onClick={onOpen}>
          {copy.games.open}
        </Button>
      </div>
    </Screen>
  );
}

// Ilustraciones hechas con formas, como en la referencia: no hay portadas definitivas.

function GameCover({ game, chosen }: { game: GameId; chosen: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex h-37.5 items-center justify-center gap-3 border-b-3 border-ink ${coverBackgrounds[game]}`}
    >
      {covers[game]}
      {chosen ? (
        <span className="absolute top-2.5 right-2.5 rotate-4 rounded-full border-3 border-ink bg-lime px-2.5 py-0.5 text-xs font-bold">
          {copy.games.chosen}
        </span>
      ) : null}
    </span>
  );
}

const coverBackgrounds: Record<GameId, string> = {
  impostor: 'bg-tomato',
  probable: 'bg-sky',
  quien_lo_dijo: 'bg-lilac',
  una_pista: 'bg-lime',
};

function ImpostorFaces() {
  return (
    <>
      <Face />
      <span className="flex size-19 -rotate-6 items-center justify-center gap-3 rounded-full border-3 border-ink bg-ink">
        <span className="h-2 w-4 rounded-full bg-ground" />
        <span className="h-2 w-4 rounded-full bg-ground" />
      </span>
      <Face />
    </>
  );
}

/** Tres caras y la del centro, la señalada, con su punto. */
function ProbableFaces() {
  return (
    <>
      <Face />
      <span className="relative flex size-19 items-center justify-center gap-3 rounded-full border-3 border-ink bg-lime">
        <span className="size-2 rounded-full bg-ink" />
        <span className="size-2 rounded-full bg-ink" />
        <span className="absolute -top-4 -right-3 rotate-4 rounded-full border-3 border-ink bg-paper px-2 font-display text-lg">
          {copy.games.covers.point}
        </span>
      </span>
      <Face />
    </>
  );
}

/** Un bocadillo anónimo y la cara de quien pudo decirlo. */
function QuienLoDijoBubble() {
  return (
    <>
      <span className="-rotate-4 rounded-chip rounded-bl-none border-3 border-ink bg-paper px-5 py-1 font-display text-5xl">
        {copy.games.covers.quote}
      </span>
      <Face />
    </>
  );
}

/** Dos pistas iguales: la repetida se anula. */
function RepeatedClues() {
  return (
    <>
      <span className="-rotate-4 rounded-control border-3 border-ink bg-paper px-3 py-1 font-display text-2xl uppercase">
        {copy.games.covers.clue}
      </span>
      <span className="rotate-3 rounded-control border-3 border-dashed border-ink bg-ground-soft px-3 py-1 font-display text-2xl uppercase line-through decoration-4">
        {copy.games.covers.clue}
      </span>
    </>
  );
}

const covers: Record<GameId, ReactNode> = {
  impostor: <ImpostorFaces />,
  probable: <ProbableFaces />,
  quien_lo_dijo: <QuienLoDijoBubble />,
  una_pista: <RepeatedClues />,
};

function Face() {
  return (
    <span className="flex size-15 items-center justify-center gap-2.5 rounded-full border-3 border-ink bg-paper">
      <span className="size-2 rounded-full bg-ink" />
      <span className="size-2 rounded-full bg-ink" />
    </span>
  );
}

const upcomingBackgrounds = ['bg-lilac', 'bg-orange', 'bg-lime'] as const;

function UpcomingCover({ index }: { index: number }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-17 items-center justify-center gap-2 border-b-3 border-ink ${upcomingBackgrounds[index] ?? 'bg-sky'}`}
    >
      {index === 0 ? (
        <span className="rotate-3 rounded-control border-3 border-ink bg-paper px-2.5 py-0.5 font-display text-lg uppercase line-through decoration-4">
          {copy.games.covers.banned}
        </span>
      ) : null}
      {index === 1 ? (
        <span className="relative size-10 rounded-full bg-ink">
          <span className="absolute -top-2.5 right-0.5 h-4 w-1.5 rotate-35 bg-ink" />
          <span className="absolute -top-4 -right-2.5 size-3 rounded-full border-3 border-ink bg-tomato" />
        </span>
      ) : null}
      {index === 2 ? (
        <>
          <span className="flex size-10 -rotate-5 items-center justify-center rounded-control border-3 border-ink bg-paper font-display text-xl">
            {copy.games.covers.optionA}
          </span>
          <span className="flex size-10 rotate-5 items-center justify-center rounded-control border-3 border-ink bg-ink font-display text-xl text-paper">
            {copy.games.covers.optionB}
          </span>
        </>
      ) : null}
    </div>
  );
}
