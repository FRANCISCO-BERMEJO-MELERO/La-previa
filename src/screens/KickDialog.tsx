import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { copy } from '@/lib/copy';

type KickDialogProps = {
  /** Nombre del jugador a echar; sin nombre, el diálogo está cerrado. */
  name: string | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function KickDialog({ name, busy, onCancel, onConfirm }: KickDialogProps) {
  return (
    <Dialog
      open={name !== null}
      title={name ? copy.lobby.kickTitle(name) : ''}
      closeLabel={copy.room.cancel}
      onClose={onCancel}
    >
      <p className="text-base">{copy.lobby.kickText}</p>
      <Button fullWidth disabled={busy} onClick={onConfirm}>
        {copy.lobby.kickConfirm}
      </Button>
    </Dialog>
  );
}
