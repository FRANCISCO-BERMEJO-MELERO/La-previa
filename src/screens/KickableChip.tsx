import type { ReactNode } from 'react';
import { copy } from '@/lib/copy';

type KickableChipProps = {
  name: string;
  disabled: boolean;
  onKickRequest: () => void;
  /** La ficha del jugador. */
  children: ReactNode;
};

/** Ficha que el anfitrión toca para echar al jugador: un botón aparte no cabe a 360 px. */
export function KickableChip({ name, disabled, onKickRequest, children }: KickableChipProps) {
  return (
    <button
      type="button"
      aria-label={copy.lobby.kick(name)}
      aria-haspopup="dialog"
      disabled={disabled}
      onClick={onKickRequest}
      className="block w-full rounded-chip text-left"
    >
      {children}
    </button>
  );
}
