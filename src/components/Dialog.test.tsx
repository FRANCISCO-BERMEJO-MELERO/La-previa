import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

// jsdom no implementa showModal ni close; se reproduce su efecto sobre el atributo `open`.
const proto = HTMLDialogElement.prototype;
const original = {
  showModal: Object.getOwnPropertyDescriptor(proto, 'showModal'),
  close: Object.getOwnPropertyDescriptor(proto, 'close'),
};

function restore(name: keyof typeof original) {
  const descriptor = original[name];
  if (descriptor) Object.defineProperty(proto, name, descriptor);
  else Reflect.deleteProperty(proto, name);
}

beforeAll(() => {
  Object.defineProperty(proto, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(proto, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    },
  });
});

afterAll(() => {
  restore('showModal');
  restore('close');
});

function renderDialog(open: boolean, onClose = vi.fn()) {
  return render(
    <Dialog open={open} title="Únete con el QR" closeLabel="Cerrar" onClose={onClose}>
      <p>contenido</p>
    </Dialog>,
  );
}

describe('Dialog', () => {
  it('cerrado no se muestra', () => {
    renderDialog(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto se muestra con su título como nombre accesible', () => {
    renderDialog(true);
    expect(screen.getByRole('dialog', { name: 'Únete con el QR' })).toBeInTheDocument();
  });

  it('el botón de cerrar avisa al padre', () => {
    const onClose = vi.fn();
    renderDialog(true, onClose);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('se cierra cuando el padre deja de pedirlo abierto y avisa del cierre nativo', () => {
    const onClose = vi.fn();
    const { rerender } = renderDialog(true, onClose);
    rerender(
      <Dialog open={false} title="Únete con el QR" closeLabel="Cerrar" onClose={onClose}>
        <p>contenido</p>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
