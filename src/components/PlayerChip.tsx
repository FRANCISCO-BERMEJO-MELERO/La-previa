import type { ReactNode } from 'react';
import { Avatar } from './Avatar';

type PlayerChipProps = {
  name: string;
  /** Sin posición no se dibuja avatar, como en la lista de quién ha votado. */
  joinIndex?: number;
  /** Segunda línea: "Anfitrión", "Desconectada", "Ha votado"… */
  detail?: string;
  /** Desconectado o pendiente: borde discontinuo y fondo apagado. */
  muted?: boolean;
  /** Acción al final de la ficha, como expulsar. */
  action?: ReactNode;
};

export function PlayerChip({ name, joinIndex, detail, muted = false, action }: PlayerChipProps) {
  const look = muted ? 'border-dashed bg-ground-soft' : 'bg-paper';
  return (
    <div
      data-testid="player-chip"
      className={`flex min-w-0 items-center gap-2.5 rounded-chip border-3 border-ink p-2.5 ${look}`}
    >
      {joinIndex === undefined ? null : <Avatar name={name} joinIndex={joinIndex} muted={muted} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base font-bold">{name}</span>
        {detail ? <span className="text-xs font-medium">{detail}</span> : null}
      </div>
      {action}
    </div>
  );
}
