import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { copy } from '@/lib/copy';

type LeaveDialogProps = {
  open: boolean;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LeaveDialog({ open, busy, error, onCancel, onConfirm }: LeaveDialogProps) {
  return (
    <Dialog
      open={open}
      title={copy.room.leaveTitle}
      closeLabel={copy.room.cancel}
      onClose={onCancel}
    >
      <p className="text-base">{copy.room.leaveText}</p>
      {error ? (
        <p role="alert" className="animate-caer text-md font-bold">
          {error}
        </p>
      ) : null}
      <Button fullWidth disabled={busy} onClick={onConfirm}>
        {copy.room.leaveConfirm}
      </Button>
    </Dialog>
  );
}
