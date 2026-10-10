'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { copy } from '@/lib/copy';

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
        }}
      >
        {copy.dev.openDialog}
      </Button>
      <Dialog open={open} title={copy.lobby.qrTitle} closeLabel={copy.lobby.close} onClose={close}>
        <p className="text-base">{copy.dev.dialogText}</p>
      </Dialog>
    </>
  );
}
