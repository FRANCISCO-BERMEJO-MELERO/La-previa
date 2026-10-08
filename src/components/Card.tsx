import type { ReactNode } from 'react';

type CardVariant = 'normal' | 'hero' | 'dark';
type CardTone = 'paper' | 'lime';
type CardTilt = 'left' | 'right';

type CardProps = {
  variant?: CardVariant;
  /** Fondo de la tarjeta; la oscura siempre es `ink`. */
  tone?: CardTone;
  /** Solo las tarjetas protagonistas giran. */
  tilt?: CardTilt;
  /** Ocupa el alto libre de la pantalla. */
  grow?: boolean;
  children: ReactNode;
};

const variantClasses: Record<CardVariant, string> = {
  normal: 'gap-3 rounded-card p-5 shadow-hard',
  hero: 'mx-1 gap-4 rounded-hero p-6 shadow-hard-lg',
  dark: 'mx-1 gap-4 rounded-hero bg-ink p-6 text-paper shadow-hard-lg-tomato',
};

const toneClasses: Record<CardTone, string> = {
  paper: 'bg-paper',
  lime: 'bg-lime',
};

const tiltClasses: Record<CardTilt, string> = {
  left: 'tilt-left',
  right: 'tilt-right',
};

export function Card({
  variant = 'normal',
  tone = 'paper',
  tilt,
  grow = false,
  children,
}: CardProps) {
  const background = variant === 'dark' ? '' : toneClasses[tone];
  const rotation = variant !== 'normal' && tilt ? tiltClasses[tilt] : '';
  const height = grow ? 'flex-1' : '';
  return (
    <div
      data-testid="card"
      className={`flex min-w-0 flex-col border-3 border-ink hyphens-auto wrap-break-word ${variantClasses[variant]} ${background} ${rotation} ${height}`}
    >
      {children}
    </div>
  );
}
