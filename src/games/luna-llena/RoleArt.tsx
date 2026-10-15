import type { ReactNode } from 'react';
import { copy } from '@/lib/copy';
import type { LunaRole } from './roles';

// Las siete ilustraciones del anexo de docs/PLAN-5.md, con sus mismas formas en un lienzo de
// 300 × 220. Los colores y el trazo salen de los tokens de Verbena.

const shapes: Record<LunaRole, ReactNode> = {
  wolf: (
    <>
      <circle cx={238} cy={54} r={30} className="fill-ground" />
      <polygon points="90,98 102,28 142,80" className="fill-ink" />
      <polygon points="210,98 198,28 158,80" className="fill-ink" />
      <polygon points="84,90 216,90 198,160 150,204 102,160" className="fill-ink" />
      <ellipse cx={124} cy={122} rx={13} ry={8} className="fill-ground" />
      <ellipse cx={176} cy={122} rx={13} ry={8} className="fill-ground" />
      <polygon points="128,152 172,152 150,198" className="fill-paper" />
      <circle cx={150} cy={186} r={6} className="fill-ink" />
    </>
  ),
  villager: (
    <>
      <circle cx={150} cy={132} r={54} className="fill-paper" />
      <path d="M104 88 Q104 30 150 30 Q196 30 196 88 Z" className="fill-ground" />
      <rect x={104} y={70} width={92} height={16} className="fill-tomato" />
      <ellipse cx={150} cy={90} rx={88} ry={16} className="fill-ground" />
      <circle cx={132} cy={134} r={5} className="fill-ink" />
      <circle cx={168} cy={134} r={5} className="fill-ink" />
      <path d="M130 156 Q150 174 170 156" className="fill-none" />
    </>
  ),
  seer: (
    <>
      <path d="M94 200 L206 200 L190 168 L110 168 Z" className="fill-ground" />
      <circle cx={150} cy={100} r={74} className="fill-sky" />
      <path d="M98 100 Q150 54 202 100 Q150 146 98 100 Z" className="fill-paper" />
      <circle cx={150} cy={100} r={19} className="fill-ink" />
      <circle cx={157} cy={93} r={5} className="fill-paper stroke-none" />
    </>
  ),
  protector: (
    <>
      <path
        d="M150 22 L228 48 L228 110 Q228 172 150 202 Q72 172 72 110 L72 48 Z"
        className="fill-paper"
      />
      <path d="M150 22 L228 48 L228 110 Q228 172 150 202 Z" className="fill-lime" />
      <rect x={138} y={74} width={24} height={76} className="fill-ink stroke-none" />
      <rect x={112} y={100} width={76} height={24} className="fill-ink stroke-none" />
    </>
  ),
  hunter: (
    <>
      <circle cx={150} cy={110} r={78} className="fill-paper" />
      <circle cx={150} cy={110} r={52} className="fill-tomato" />
      <circle cx={150} cy={110} r={24} className="fill-paper" />
      <line x1={150} y1={14} x2={150} y2={206} />
      <line x1={54} y1={110} x2={246} y2={110} />
      <circle cx={150} cy={110} r={7} className="fill-ink" />
    </>
  ),
  jester: (
    <>
      <polygon points="92,126 58,42 134,98" className="fill-tomato" />
      <polygon points="208,126 242,42 166,98" className="fill-sky" />
      <polygon points="116,108 150,26 184,108" className="fill-lime" />
      <circle cx={58} cy={42} r={11} className="fill-paper" />
      <circle cx={242} cy={42} r={11} className="fill-paper" />
      <circle cx={150} cy={26} r={11} className="fill-paper" />
      <circle cx={150} cy={150} r={52} className="fill-paper" />
      <circle cx={132} cy={142} r={5} className="fill-ink" />
      <circle cx={168} cy={142} r={5} className="fill-ink" />
      <path d="M122 160 Q150 196 178 160 Z" className="fill-ink" />
    </>
  ),
  cupid: (
    <>
      <path
        d="M150 194 C56 132 68 46 120 46 C140 46 150 62 150 76 C150 62 160 46 180 46 C232 46 244 132 150 194 Z"
        className="fill-tomato"
      />
      <line x1={44} y1={178} x2={252} y2={48} />
      <polygon points="262,42 228,44 248,74" className="fill-ink" />
      <polygon points="44,178 36,150 62,166" className="fill-paper" />
      <polygon points="44,178 72,188 62,166" className="fill-paper" />
    </>
  ),
};

type RoleArtProps = {
  role: LunaRole;
  /** Junto al nombre del rol el dibujo es decorativo y no se anuncia. */
  decorative?: boolean;
};

export function RoleArt({ role, decorative = false }: RoleArtProps) {
  const label = decorative
    ? { 'aria-hidden': true }
    : { role: 'img', 'aria-label': copy.lunaLlena.roles[role].art };
  return (
    <svg
      viewBox="0 0 300 220"
      {...label}
      className="block w-full stroke-ink"
      strokeWidth={5}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {shapes[role]}
    </svg>
  );
}
