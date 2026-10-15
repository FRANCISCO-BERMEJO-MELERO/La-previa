'use client';

import { useEffect, useState } from 'react';
import { copy } from '@/lib/copy';
import { RoleCard } from './RoleCard';
import type { LunaRole } from './roles';

/** Lo que dura la carta a la vista si nadie la oculta antes. */
export const PEEK_MS = 4000;

type CardPeekProps = {
  role: LunaRole;
  pack: readonly string[];
};

/**
 * Botón discreto para volver a ver la carta. Se ve mientras se mantiene pulsado y se oculta al
 * soltar o, si se abrió con el teclado o un lector de pantalla, a los pocos segundos.
 */
export function CardPeek({ role, pack }: CardPeekProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setOpen(false);
    }, PEEK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [open]);

  const hide = () => {
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onPointerDown={() => {
          setOpen(true);
        }}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        // Un toque largo en el móvil no debe abrir el menú del navegador.
        onContextMenu={(event) => {
          event.preventDefault();
        }}
        onClick={(event) => {
          // Sin puntero (teclado o lector de pantalla), el clic abre la carta un rato.
          if (event.detail === 0) setOpen(true);
        }}
        className="h-11 self-center rounded-full border-3 border-dashed border-ink px-4 text-md font-bold select-none"
      >
        {open ? copy.lunaLlena.deal.peekOpen : copy.lunaLlena.deal.peek}
      </button>
      {open ? (
        // Sin eventos de puntero: el dedo sigue sobre el botón, que es quien la oculta al soltar.
        <div className="pointer-events-none fixed inset-0 z-10 mx-auto flex max-w-md flex-col bg-ground px-6 py-8">
          <RoleCard role={role} pack={pack} headingLevel={2} />
        </div>
      ) : null}
    </>
  );
}
