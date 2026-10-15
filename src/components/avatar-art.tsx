import type { ReactNode } from 'react';
import type { AvatarId } from '@/lib/avatars';

// Ilustraciones de la galería de avatares, dibujadas con formas en la paleta de Verbena y con el
// borde grueso de la app. Caja de 40 × 40; se leen también al tamaño más pequeño (36 px).

const line = 'stroke-ink';
const W = 2.5;

function Eyes({ y = 19, gap = 4, r = 2 }: { y?: number; gap?: number; r?: number }) {
  return (
    <>
      <circle cx={20 - gap} cy={y} r={r} className="fill-ink" />
      <circle cx={20 + gap} cy={y} r={r} className="fill-ink" />
    </>
  );
}

function Smile({ y = 25, width = 6 }: { y?: number; width?: number }) {
  return (
    <path
      d={`M${String(20 - width / 2)} ${String(y)} q${String(width / 2)} 2.5 ${String(width)} 0`}
      className={`fill-none ${line}`}
      strokeWidth={2}
      strokeLinecap="round"
    />
  );
}

export const avatarArt: Record<AvatarId, ReactNode> = {
  // Aguacate con gafas de sol.
  avocado: (
    <>
      <ellipse cx={20} cy={22} rx={11} ry={14} className={`fill-lime ${line}`} strokeWidth={W} />
      <rect x={11} y={14} width={8} height={5} rx={1.5} className="fill-ink" />
      <rect x={21} y={14} width={8} height={5} rx={1.5} className="fill-ink" />
      <path d="M19 16 h2" className={line} strokeWidth={2} />
      <circle cx={20} cy={28} r={4.5} className={`fill-orange ${line}`} strokeWidth={2} />
    </>
  ),
  // Huevo frito.
  egg: (
    <>
      <path
        d="M7 21 q0 -13 13 -13 q13 0 13 12 q0 13 -13 13 q-13 0 -13 -12 z"
        className={`fill-paper ${line}`}
        strokeWidth={W}
      />
      <circle cx={20} cy={21} r={7.5} className={`fill-orange ${line}`} strokeWidth={2} />
      <Eyes y={20} gap={2.6} r={1.4} />
      <Smile y={23} width={4} />
    </>
  ),
  // Fantasma con la boca abierta.
  ghost: (
    <>
      <path
        d="M10 34 V18 a10 10 0 0 1 20 0 V34 l-3.3 -3 -3.4 3 -3.3 -3 -3.3 3 -3.4 -3 z"
        className={`fill-paper ${line}`}
        strokeWidth={W}
        strokeLinejoin="round"
      />
      <ellipse cx={16} cy={18} rx={1.8} ry={2.6} className="fill-ink" />
      <ellipse cx={24} cy={18} rx={1.8} ry={2.6} className="fill-ink" />
      <circle cx={20} cy={25} r={2.2} className="fill-ink" />
    </>
  ),
  // Cactus con los brazos arriba.
  cactus: (
    <>
      <rect
        x={7}
        y={13}
        width={6}
        height={11}
        rx={3}
        className={`fill-lime ${line}`}
        strokeWidth={W}
      />
      <rect
        x={27}
        y={11}
        width={6}
        height={11}
        rx={3}
        className={`fill-lime ${line}`}
        strokeWidth={W}
      />
      <rect
        x={13}
        y={7}
        width={14}
        height={28}
        rx={7}
        className={`fill-lime ${line}`}
        strokeWidth={W}
      />
      <Eyes y={17} gap={2.8} r={1.6} />
      <Smile y={21} width={4} />
    </>
  ),
  // Plátano: un trazo grueso con borde, y la cara en el centro de la curva.
  banana: (
    <>
      <path d="M10 9 l-2 -3" className={line} strokeWidth={W} strokeLinecap="round" />
      <path
        d="M10 10 Q12 31 32 28"
        className="fill-none stroke-ink"
        strokeWidth={13}
        strokeLinecap="round"
      />
      <path
        d="M10 10 Q12 31 32 28"
        className="fill-none stroke-ground"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <circle cx={15} cy={22.5} r={1.4} className="fill-ink" />
      <circle cx={19.5} cy={25.5} r={1.4} className="fill-ink" />
    </>
  ),
  // Porción de pizza.
  pizza: (
    <>
      <path
        d="M7 9 L33 9 L20 35 Z"
        className={`fill-orange ${line}`}
        strokeWidth={W}
        strokeLinejoin="round"
      />
      <circle cx={13} cy={12.5} r={2} className="fill-tomato" />
      <circle cx={20} cy={29} r={2} className="fill-tomato" />
      <Eyes y={16} gap={3} r={1.6} />
      <Smile y={20} width={4} />
    </>
  ),
  // Nube enfadada.
  cloud: (
    <>
      <path
        d="M10 29 a6 6 0 0 1 0 -12 a9 9 0 0 1 17 -3 a7 7 0 0 1 3 15 z"
        className={`fill-paper ${line}`}
        strokeWidth={W}
        strokeLinejoin="round"
      />
      <path d="M14 17 l4 2 M26 17 l-4 2" className={line} strokeWidth={2} strokeLinecap="round" />
      <Eyes y={21} r={1.6} />
      <path
        d="M17 26 q3 -2 6 0"
        className={`fill-none ${line}`}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </>
  ),
  // Tostada.
  toast: (
    <>
      <rect
        x={8}
        y={8}
        width={24}
        height={26}
        rx={7}
        className={`fill-orange ${line}`}
        strokeWidth={W}
      />
      <rect x={12} y={12} width={16} height={18} rx={4} className="fill-ground" />
      <Eyes y={19} gap={3.2} r={1.6} />
      <Smile y={24} width={5} />
    </>
  ),
  // Pulpo.
  octopus: (
    <>
      <path
        d="M12 25 q-2 6 -5 8 M17 27 q0 5 -2 8 M23 27 q0 5 2 8 M28 25 q2 6 5 8"
        className={`fill-none ${line}`}
        strokeWidth={W}
        strokeLinecap="round"
      />
      <circle cx={20} cy={17} r={10} className={`fill-lilac ${line}`} strokeWidth={W} />
      <Eyes y={16} gap={3.5} r={1.7} />
      <Smile y={20} width={4} />
    </>
  ),
  // Dónut con virutas.
  donut: (
    <>
      <circle cx={20} cy={20} r={14} className={`fill-orange ${line}`} strokeWidth={W} />
      <circle cx={20} cy={20} r={11} className="fill-tomato" />
      <path
        d="M13 13 l2 1 M26 12 l1 2 M28 23 l2 -1 M12 25 l1 2"
        className="stroke-paper"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <circle cx={20} cy={20} r={3.5} className={`fill-paper ${line}`} strokeWidth={2} />
      <Eyes y={15} gap={4.5} r={1.5} />
      <Smile y={26} width={5} />
    </>
  ),
  // Cohete.
  rocket: (
    <>
      <path
        d="M17 27 l3 9 3 -9 z"
        className={`fill-orange ${line}`}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M13 21 l-5 8 h5 z M27 21 l5 8 h-5 z"
        className={`fill-tomato ${line}`}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M20 5 q8 8 8 22 h-16 q0 -14 8 -22 z"
        className={`fill-paper ${line}`}
        strokeWidth={W}
        strokeLinejoin="round"
      />
      <circle cx={20} cy={17} r={4} className={`fill-sky ${line}`} strokeWidth={2} />
    </>
  ),
  // Pingüino.
  penguin: (
    <>
      <ellipse cx={20} cy={21} rx={12} ry={14} className={`fill-ink ${line}`} strokeWidth={W} />
      <ellipse cx={20} cy={25} rx={7.5} ry={9} className="fill-paper" />
      <circle cx={16} cy={15} r={2.4} className="fill-paper" />
      <circle cx={24} cy={15} r={2.4} className="fill-paper" />
      <circle cx={16} cy={15} r={1.1} className="fill-ink" />
      <circle cx={24} cy={15} r={1.1} className="fill-ink" />
      <path
        d="M17.5 19 l2.5 3 2.5 -3 z"
        className={`fill-orange ${line}`}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </>
  ),
};
