'use client';

import { copy } from '@/lib/copy';
import type { Snapshot } from '@/lib/snapshot';
import { useRoomSync } from '@/lib/use-room-sync';
import { viewFor } from '@/lib/view';
import { LobbyScreen } from '@/screens/LobbyScreen';
import { RoomGoneScreen } from '@/screens/RoomGoneScreen';
import { StatusScreen } from '@/screens/StatusScreen';

type RoomProps = {
  initial: Snapshot;
};

export function Room({ initial }: RoomProps) {
  const sync = useRoomSync(initial.room.id, initial);
  if (sync.status === 'gone') return <RoomGoneScreen />;

  const snapshot = sync.snapshot ?? initial;
  if (viewFor(snapshot) === 'lobby') return <LobbyScreen snapshot={snapshot} />;

  // Las pantallas de partida llegan con la fase 5.
  return <StatusScreen title={copy.late.pill} />;
}
