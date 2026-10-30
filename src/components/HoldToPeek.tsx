'use client';

import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { STAGE_CARD, STAGE_HIDDEN, useStage } from './stage-context';

type HoldToPeekProps = {
  /** Titular de la tapa. */
  title: string;
  /** Lo que se ve debajo del titular. */
  hint: string;
  /** Lo que tapa: está en el DOM, pero no se ve ni se lee hasta levantarla. */
  children: ReactNode;
};

const HOLD_KEYS = new Set([' ', 'Enter']);

function isHoldKey(event: KeyboardEvent): boolean {
  return HOLD_KEYS.has(event.key);
}

/**
 * Mantener para mirar (docs/PLAN-8.md §8): una tapa que se levanta mientras se mantiene pulsada y
 * vuelve a caer al soltar. Con el teclado, mientras se mantiene Espacio o Intro; con un lector de
 * pantalla (clic sin puntero), cada activación la abre o la cierra. Es igual para todos: no dice
 * nada de lo que hay debajo.
 */
export function HoldToPeek({ title, hint, children }: HoldToPeekProps) {
  const [open, setOpen] = useState(false);
  const stage = useStage();
  const hide = () => {
    setOpen(false);
  };
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Tapada no sale en la copia que se va al cambiar de fase: se iría la tapa, no lo de debajo. */}
      <div
        data-testid="peek-content"
        {...(open ? {} : { [STAGE_HIDDEN]: '' })}
        className={`flex flex-1 flex-col ${open ? '' : 'invisible'}`}
      >
        {children}
      </div>
      <button
        key={stage.key}
        type="button"
        aria-pressed={open}
        {...(open ? {} : { [STAGE_CARD]: '' })}
        onPointerDown={(event) => {
          // El dedo puede salirse de la tapa al levantarla: soltar sigue llegando aquí.
          if ('setPointerCapture' in event.currentTarget) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          setOpen(true);
        }}
        onPointerUp={hide}
        onPointerCancel={hide}
        onBlur={hide}
        onKeyDown={(event) => {
          if (!isHoldKey(event)) return;
          // Sin el clic que el navegador genera con Intro, ni el desplazamiento de Espacio.
          event.preventDefault();
          if (!event.repeat) setOpen(true);
        }}
        onKeyUp={(event) => {
          if (!isHoldKey(event)) return;
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          // Un lector de pantalla activa sin puntero ni teclas: alterna.
          if (event.detail === 0) setOpen((value) => !value);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
        className={`tapa absolute inset-0 mx-1 flex flex-col items-center justify-center gap-2 rounded-hero border-3 border-ink bg-sky p-6 text-center shadow-hard-lg select-none tilt-left ${open ? 'tapa-arriba' : ''} ${stage.entering ? 'animate-entrar' : ''}`}
      >
        <span className="font-display text-display-xs uppercase">{title}</span>{' '}
        <span className="text-lead font-bold">{hint}</span>
      </button>
    </div>
  );
}
