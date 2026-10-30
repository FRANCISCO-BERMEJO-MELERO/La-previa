/**
 * El telón de El lobo (docs/PLAN-8.md §6): al anochecer baja un panel `ink`, cae la luna y se
 * aparta; al amanecer sube. Es igual en todos los móviles, vivos y muertos, y no tapa los botones:
 * no recibe toques.
 */
export function Curtain({ direction }: { direction: 'down' | 'up' }) {
  return (
    <div
      aria-hidden="true"
      data-testid="curtain"
      className={`pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-ink ${direction === 'down' ? 'animate-telon-noche' : 'animate-telon-amanecer'}`}
    >
      <span
        className={`size-28 rounded-full border-3 border-paper bg-ground ${direction === 'down' ? 'animate-caer anim-delay-200' : ''}`}
      />
    </div>
  );
}
