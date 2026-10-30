import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HoldToPeek } from './HoldToPeek';

function renderPeek() {
  render(
    <HoldToPeek title="Mantén pulsado" hint="para ver tu palabra">
      <h1>Paella</h1>
    </HoldToPeek>,
  );
  return screen.getByRole('button', { name: 'Mantén pulsado para ver tu palabra' });
}

function shown(): boolean {
  return !screen.getByTestId('peek-content').classList.contains('invisible');
}

describe('HoldToPeek', () => {
  it('tapado, lo de debajo está en el DOM pero no se ve', () => {
    const cover = renderPeek();
    expect(screen.getByTestId('peek-content')).toHaveTextContent('Paella');
    expect(shown()).toBe(false);
    expect(cover).toHaveAttribute('aria-pressed', 'false');
  });

  it('pulsar muestra y soltar oculta', () => {
    const cover = renderPeek();
    fireEvent.pointerDown(cover, { pointerId: 1 });
    expect(shown()).toBe(true);
    expect(cover).toHaveClass('tapa-arriba');
    fireEvent.pointerUp(cover, { pointerId: 1 });
    expect(shown()).toBe(false);
    expect(cover).not.toHaveClass('tapa-arriba');
  });

  it('el clic que sigue a soltar el dedo no la deja abierta', () => {
    const cover = renderPeek();
    fireEvent.pointerDown(cover, { pointerId: 1 });
    fireEvent.pointerUp(cover, { pointerId: 1 });
    fireEvent.click(cover, { detail: 1 });
    expect(shown()).toBe(false);
  });

  it('un clic sin puntero alterna, para los lectores de pantalla', () => {
    const cover = renderPeek();
    fireEvent.click(cover, { detail: 0 });
    expect(shown()).toBe(true);
    expect(cover).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(cover, { detail: 0 });
    expect(shown()).toBe(false);
  });

  it.each([' ', 'Enter'])('con el teclado, mientras se mantiene «%s»', (key) => {
    const cover = renderPeek();
    fireEvent.keyDown(cover, { key });
    expect(shown()).toBe(true);
    fireEvent.keyDown(cover, { key, repeat: true });
    expect(shown()).toBe(true);
    fireEvent.keyUp(cover, { key });
    expect(shown()).toBe(false);
  });

  it('otras teclas no la levantan, y perder el foco la baja', () => {
    const cover = renderPeek();
    fireEvent.keyDown(cover, { key: 'a' });
    expect(shown()).toBe(false);
    fireEvent.keyDown(cover, { key: 'Enter' });
    fireEvent.blur(cover);
    expect(shown()).toBe(false);
  });

  it('tapada, lo de debajo no sale en la copia del cambio de fase; la tapa sí', () => {
    const cover = renderPeek();
    expect(screen.getByTestId('peek-content')).toHaveAttribute('data-stage-hidden');
    expect(cover).toHaveAttribute('data-stage-card');
    fireEvent.pointerDown(cover, { pointerId: 1 });
    expect(screen.getByTestId('peek-content')).not.toHaveAttribute('data-stage-hidden');
  });
});
