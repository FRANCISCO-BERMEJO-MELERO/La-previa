'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { motionMs } from '@/lib/motion';
import { STAGE_CARD, StageContext } from './stage-context';

type Placed = { node: HTMLElement; left: number; top: number; width: number; height: number };

/**
 * Dónde está cada tarjeta en la ventana según su caja, sin giros ni animaciones en curso: el
 * fantasma lleva el giro en sus propias clases.
 */
function measure(root: HTMLElement): Placed[] {
  return [...root.querySelectorAll<HTMLElement>(`[${STAGE_CARD}]`)].map((node) => {
    let left = -window.scrollX;
    let top = -window.scrollY;
    for (let box: Element | null = node; box instanceof HTMLElement; box = box.offsetParent) {
      left += box.offsetLeft;
      top += box.offsetTop;
    }
    return { node, left, top, width: node.offsetWidth, height: node.offsetHeight };
  });
}

/** Copia muda de una tarjeta que ya no existe, en el sitio donde estaba. */
function ghostOf({ node, left, top, width, height }: Placed): HTMLElement {
  const ghost = node.cloneNode(true);
  if (!(ghost instanceof HTMLElement)) throw new Error('La tarjeta no es un elemento');
  ghost.removeAttribute('id');
  ghost.removeAttribute(STAGE_CARD);
  for (const child of ghost.querySelectorAll('[id]')) child.removeAttribute('id');
  // Posición medida, no un valor de diseño: el fantasma vive fuera de React.
  Object.assign(ghost.style, {
    position: 'absolute',
    margin: '0',
    left: `${String(left)}px`,
    top: `${String(top)}px`,
    width: `${String(width)}px`,
    height: `${String(height)}px`,
  });
  ghost.classList.add('animate-salir');
  return ghost;
}

type PhaseStageProps = {
  stageKey: string;
  entering: boolean;
  children: ReactNode;
};

/**
 * «Cambio de fase» (docs/PLAN-8.md §3): la pantalla nueva se monta en el acto y su tarjeta
 * protagonista entra; la vieja se pinta un momento encima como fantasma inerte y sale.
 */
export function PhaseStage({ stageKey, entering, children }: PhaseStageProps) {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const last = useRef<{ key: string; cards: Placed[] } | null>(null);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useLayoutEffect(() => {
    const container = root.current;
    const ghosts = layer.current;
    if (!container || !ghosts) return;
    const before = last.current;
    if (entering && before && before.key !== stageKey) {
      for (const card of before.cards) {
        const ghost = ghostOf(card);
        // Por si la animación no llega a correr (pestaña oculta): nunca se queda encima.
        const timer = setTimeout(() => {
          ghost.remove();
          timers.current.delete(timer);
        }, motionMs.lento + motionMs.base);
        timers.current.add(timer);
        ghost.addEventListener('animationend', () => {
          ghost.remove();
        });
        ghosts.append(ghost);
      }
    }
    last.current = { key: stageKey, cards: measure(container) };
  });

  useEffect(() => {
    const ghosts = layer.current;
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.clear();
      ghosts?.replaceChildren();
    };
  }, []);

  return (
    <StageContext value={{ key: stageKey, entering }}>
      <div ref={root} className="contents">
        {children}
      </div>
      <div
        ref={layer}
        aria-hidden="true"
        inert
        data-testid="phase-ghosts"
        className="pointer-events-none fixed inset-0 z-20 overflow-hidden"
      />
    </StageContext>
  );
}
