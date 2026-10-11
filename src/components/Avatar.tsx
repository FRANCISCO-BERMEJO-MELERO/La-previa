import type { AvatarId } from '@/lib/avatars';
import { avatarArt } from './avatar-art';
import { avatarColor, initialOf } from './avatar-color';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  name: string;
  joinIndex: number;
  /** Ilustración elegida de la galería; sin ella, la inicial sobre su color. */
  avatar?: AvatarId | null;
  size?: AvatarSize;
  /** Jugador desconectado: sin color de la paleta. */
  muted?: boolean;
  /** Desconectado en una fila de avatares: borde discontinuo y fondo apagado. */
  dashed?: boolean;
  /** Sobre fondo `ink` el borde pasa a blanco. */
  onDark?: boolean;
};

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'size-9 text-base font-bold',
  md: 'size-20 font-display text-4xl',
  lg: 'size-24 font-display text-5xl',
};

const colorClasses = {
  tomato: 'bg-tomato',
  sky: 'bg-sky',
  lime: 'bg-lime',
  lilac: 'bg-lilac',
  orange: 'bg-orange',
} as const;

export function Avatar({
  name,
  joinIndex,
  avatar = null,
  size = 'sm',
  muted = false,
  dashed = false,
  onDark = false,
}: AvatarProps) {
  const color = dashed
    ? 'bg-ground-soft'
    : muted || avatar !== null
      ? 'bg-paper'
      : colorClasses[avatarColor(joinIndex)];
  const border = `${onDark ? 'border-paper' : 'border-ink'} ${dashed ? 'border-dashed' : ''}`;
  return (
    <span
      aria-hidden="true"
      data-testid="avatar"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-3 text-ink ${border} ${color} ${sizeClasses[size]}`}
    >
      {avatar === null ? (
        initialOf(name)
      ) : (
        <svg
          viewBox="0 0 40 40"
          data-avatar={avatar}
          className={`size-full ${muted || dashed ? 'grayscale' : ''}`}
        >
          {avatarArt[avatar]}
        </svg>
      )}
    </span>
  );
}
