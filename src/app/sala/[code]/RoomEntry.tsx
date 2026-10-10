'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { joinRoom } from '@/lib/actions';
import { copy, errorMessage, type ActionError } from '@/lib/copy';
import { nameErrorText } from '@/lib/name-error';
import type { Snapshot } from '@/lib/snapshot';
import { NameScreen } from '@/screens/NameScreen';
import { RoomGoneScreen } from '@/screens/RoomGoneScreen';
import { StatusScreen } from '@/screens/StatusScreen';
import { Room } from './Room';

type Entry =
  | { kind: 'checking' }
  | { kind: 'name' }
  | { kind: 'member'; snapshot: Snapshot }
  | { kind: 'gone' }
  | { kind: 'failed'; error: ActionError };

type RoomEntryProps = {
  code: string;
  /** Viene de crear la sala. */
  fresh: boolean;
};

/**
 * Entrada a /sala/[code]. join_room devuelve el estado si ya eras miembro (reconexión)
 * y pide nombre si no lo eras, así que se llama primero sin nombre.
 */
export function RoomEntry({ code, fresh }: RoomEntryProps) {
  const [entry, setEntry] = useState<Entry>({ kind: 'checking' });
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void joinRoom(code, '').then((result) => {
      if (!active) return;
      if (result.ok) setEntry({ kind: 'member', snapshot: result.data });
      else if (result.error === 'name_invalid') setEntry({ kind: 'name' });
      else if (result.error === 'room_not_found') setEntry({ kind: 'gone' });
      else setEntry({ kind: 'failed', error: result.error });
    });
    return () => {
      active = false;
    };
  }, [code, attempt]);

  const join = useCallback(async () => {
    setBusy(true);
    setNameError(null);
    const result = await joinRoom(code, name);
    setBusy(false);
    if (result.ok) setEntry({ kind: 'member', snapshot: result.data });
    else if (result.error === 'room_not_found') setEntry({ kind: 'gone' });
    else setNameError(result.error);
  }, [code, name]);

  switch (entry.kind) {
    case 'checking':
      return <StatusScreen title={copy.room.loading} />;
    case 'gone':
      return <RoomGoneScreen />;
    case 'failed':
      return (
        <StatusScreen
          title={copy.room.failedTitle}
          text={errorMessage(entry.error)}
          action={
            <Button
              fullWidth
              onClick={() => {
                setEntry({ kind: 'checking' });
                setAttempt((n) => n + 1);
              }}
            >
              {copy.room.retry}
            </Button>
          }
        />
      );
    case 'name':
      return (
        <NameScreen
          roomCode={code}
          name={name}
          busy={busy}
          error={nameError ? nameErrorText(nameError, name) : undefined}
          onNameChange={(value) => {
            setName(value);
            setNameError(null);
          }}
          onSubmit={() => {
            void join();
          }}
        />
      );
    case 'member':
      return <Room initial={entry.snapshot} fresh={fresh} />;
  }
}
