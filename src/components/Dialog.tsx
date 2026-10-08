'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

type DialogProps = {
  open: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export function Dialog({ open, title, closeLabel, onClose, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Escape cierra el diálogo nativo sin pasar por React; se avisa al padre.
    dialog.addEventListener('close', onClose);
    return () => {
      dialog.removeEventListener('close', onClose);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="m-auto w-11/12 max-w-sm rounded-card border-3 border-ink bg-paper p-5 text-ink shadow-hard backdrop:bg-ink/60"
    >
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="font-display text-title uppercase">
          {title}
        </h2>
        {/* Cerrado no se pinta el contenido: ni ocupa el DOM ni se calcula (el QR, por ejemplo). */}
        {open ? children : null}
        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-control border-3 border-ink bg-paper text-md font-bold"
        >
          {closeLabel}
        </button>
      </div>
    </dialog>
  );
}
