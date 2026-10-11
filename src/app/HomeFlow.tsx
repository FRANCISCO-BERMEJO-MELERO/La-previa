'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createRoom } from '@/lib/actions';
import type { ActionError } from '@/lib/copy';
import { nameErrorText } from '@/lib/name-error';
import { normalizeCodeInput, roomPath } from '@/lib/room-code';
import { HomeScreen } from '@/screens/HomeScreen';
import { ScanDialog } from '@/screens/ScanDialog';
import { NameScreen } from '@/screens/NameScreen';

export function HomeFlow() {
  const router = useRouter();
  const [step, setStep] = useState<'home' | 'name'>('home');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<ActionError | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  if (step === 'home') {
    return (
      <>
        <HomeScreen
          code={code}
          busy={busy}
          onCodeChange={(value) => {
            setCode(normalizeCodeInput(value));
          }}
          onJoin={() => {
            setBusy(true);
            router.push(roomPath(code));
          }}
          onScan={() => {
            setScanning(true);
          }}
          onCreate={() => {
            setStep('name');
          }}
        />
        <ScanDialog
          open={scanning}
          onClose={() => {
            setScanning(false);
          }}
          onCode={(scanned) => {
            setScanning(false);
            setBusy(true);
            router.push(roomPath(scanned));
          }}
        />
      </>
    );
  }

  const create = async () => {
    setBusy(true);
    setError(null);
    const result = await createRoom(name);
    if (result.ok) {
      router.push(`${roomPath(result.data.room.code)}?nueva=1`);
      return;
    }
    setError(result.error);
    setBusy(false);
  };

  return (
    <NameScreen
      name={name}
      busy={busy}
      error={error ? nameErrorText(error, name) : undefined}
      onNameChange={(value) => {
        setName(value);
        setError(null);
      }}
      onSubmit={() => {
        void create();
      }}
    />
  );
}
