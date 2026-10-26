// Portada de A dados (docs/PLAN-7.md §6): tres dados en el lienzo de 300 × 220 de las cartas de
// El lobo, con los colores y el trazo de los tokens de Verbena.

function Pip({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={7} className="fill-ink stroke-none" />;
}

/** Siempre acompaña al nombre del juego, así que es decorativa. */
export function DiceArt() {
  return (
    <svg
      viewBox="0 0 300 220"
      aria-hidden="true"
      className="block w-full stroke-ink"
      strokeWidth={5}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <g transform="rotate(8 160 100)">
        <rect x={115} y={55} width={90} height={90} rx={18} className="fill-sky" />
        <Pip x={139} y={79} />
        <Pip x={181} y={121} />
      </g>
      <g transform="rotate(-12 85 115)">
        <rect x={40} y={70} width={90} height={90} rx={18} className="fill-paper" />
        <Pip x={61} y={91} />
        <Pip x={109} y={91} />
        <Pip x={85} y={115} />
        <Pip x={61} y={139} />
        <Pip x={109} y={139} />
      </g>
      <g transform="rotate(-6 225 135)">
        <rect x={180} y={90} width={90} height={90} rx={18} className="fill-lime" />
        <Pip x={201} y={111} />
        <Pip x={249} y={111} />
        <Pip x={201} y={135} />
        <Pip x={249} y={135} />
        <Pip x={201} y={159} />
        <Pip x={249} y={159} />
      </g>
    </svg>
  );
}
