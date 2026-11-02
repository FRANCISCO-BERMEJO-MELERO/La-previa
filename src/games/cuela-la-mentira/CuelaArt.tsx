// Portada de Cuela la mentira (docs/PLAN-9.md §8): un bocadillo con una respuesta tachada, en el
// lienzo de 300 × 220 de las demás portadas, con los colores y el trazo de los tokens de Verbena.

/** Siempre acompaña al nombre del juego, así que es decorativa. */
export function CuelaArt() {
  return (
    <svg
      viewBox="0 0 300 220"
      aria-hidden="true"
      className="block w-full stroke-ink"
      strokeWidth={5}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path
        d="M40 40 H250 Q262 40 262 52 V136 Q262 148 250 148 H120 L82 186 L90 148 H52 Q40 148 40 136 V52 Q40 40 52 40 Z"
        className="fill-sky"
      />
      <line x1={72} y1={78} x2={228} y2={78} />
      <line x1={72} y1={110} x2={190} y2={110} />
      <g transform="rotate(-8 205 160)">
        <rect x={150} y={136} width={110} height={46} rx={10} className="fill-tomato" />
        <line x1={168} y1={159} x2={242} y2={159} />
      </g>
    </svg>
  );
}
