import { avatarColor, initialOf } from './avatar-color';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  name: string;
  joinIndex: number;
  size?: AvatarSize;
  /** Jugador desconectado: sin color de la paleta. */
  muted?: boolean;
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
  size = 'sm',
  muted = false,
  onDark = false,
}: AvatarProps) {
  const color = muted ? 'bg-paper' : colorClasses[avatarColor(joinIndex)];
  const border = onDark ? 'border-paper' : 'border-ink';
  return (
    <span
      aria-hidden="true"
      data-testid="avatar"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-3 text-ink ${border} ${color} ${sizeClasses[size]}`}
    >
      {initialOf(name)}
    </span>
  );
}
