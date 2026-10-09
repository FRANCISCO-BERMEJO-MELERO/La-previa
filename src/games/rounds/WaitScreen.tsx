import type { ReactNode } from 'react';
import { Card } from '@/components/Card';
import { PlayerChip } from '@/components/PlayerChip';
import { copy } from '@/lib/copy';
import { GameScreen, type GameScreenProps } from '@/screens/GameScreen';
import { KickableChip } from '@/screens/KickableChip';
import type { Player } from './game-view';

type WaitScreenProps = GameScreenProps & {
  /** Qué se está esperando: "Han votado", "Han respondido"… */
  label: string;
  done: number;
  total: number;
  /** Quiénes responden, para enseñar quién falta. Sin lista, solo el contador. */
  responders?: Player[];
  /** Texto de la ficha de quien ya ha respondido. */
  doneDetail: string;
  /** Lo que ha enviado quien mira, la pregunta…; va entre el contador y las fichas. */
  children?: ReactNode;
  /** Texto para el anfitrión encima de su botón. */
  hint?: string;
  busy: boolean;
  /** Solo para el anfitrión: echar a un desconectado a media partida. */
  onKickRequest?: (userId: string) => void;
};

/** Esperando respuestas: el contador con su barra y, si se puede decir, quién falta. */
export function WaitScreen({
  label,
  done,
  total,
  responders,
  doneDetail,
  children,
  hint,
  busy,
  onKickRequest,
  footer,
  ...chrome
}: WaitScreenProps) {
  return (
    <GameScreen
      {...chrome}
      footer={
        <>
          {hint ? <p className="text-md font-medium">{hint}</p> : null}
          {footer}
        </>
      }
    >
      <Card>
        <h1 className="text-label font-bold uppercase tracking-label">{label}</h1>
        <p className="font-display text-7xl">{copy.vote.count(done, total)}</p>
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            <span
              key={index}
              className={`h-4 flex-1 rounded-full border-3 border-ink ${index < done ? 'bg-lime' : 'bg-paper'}`}
            />
          ))}
        </div>
      </Card>
      {children}
      {responders ? (
        <ul className="grid grid-cols-2 gap-3">
          {responders.map((player) => {
            const chip = (
              <PlayerChip
                name={player.name}
                muted={!player.hasResponded}
                detail={
                  player.hasResponded
                    ? doneDetail
                    : player.connected
                      ? copy.vote.thinking
                      : copy.lobby.disconnected
                }
              />
            );
            return (
              <li key={player.userId} className="min-w-0">
                {onKickRequest && !player.connected ? (
                  <KickableChip
                    name={player.name}
                    disabled={busy}
                    onKickRequest={() => {
                      onKickRequest(player.userId);
                    }}
                  >
                    {chip}
                  </KickableChip>
                ) : (
                  chip
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </GameScreen>
  );
}
