import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copy } from '@/lib/copy';
import { CardPeek, PEEK_MS } from './CardPeek';
import { RolesScreen } from './RolesScreen';

const texts = copy.lunaLlena.deal;

describe('RolesScreen', () => {
  it('enseña la carta como titular y el pie que le toca', () => {
    render(
      <RolesScreen
        aside={null}
        notice={null}
        footer={<p>{texts.waiting}</p>}
        role="wolf"
        pack={['Lucía']}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Lobo' })).toBeInTheDocument();
    expect(screen.getByText('Lucía')).toBeInTheDocument();
    expect(screen.getByText(texts.waiting)).toBeInTheDocument();
  });
});

describe('CardPeek', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('la carta no está a la vista hasta que se pide', () => {
    render(<CardPeek role="seer" pack={[]} />);
    expect(screen.queryByText('Vidente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.peek })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('se ve mientras se mantiene pulsado y se oculta al soltar', () => {
    render(<CardPeek role="seer" pack={[]} />);
    const button = screen.getByRole('button', { name: texts.peek });
    fireEvent.pointerDown(button);
    expect(screen.getByText('Vidente')).toBeInTheDocument();
    expect(button).toHaveTextContent(texts.peekOpen);
    fireEvent.pointerUp(button);
    expect(screen.queryByText('Vidente')).not.toBeInTheDocument();
  });

  it('también se oculta si el dedo se va del botón', () => {
    render(<CardPeek role="seer" pack={[]} />);
    const button = screen.getByRole('button', { name: texts.peek });
    fireEvent.pointerDown(button);
    fireEvent.pointerLeave(button);
    expect(screen.queryByText('Vidente')).not.toBeInTheDocument();
  });

  it('abierta con el teclado, se oculta sola a los pocos segundos', () => {
    render(<CardPeek role="hunter" pack={[]} />);
    fireEvent.click(screen.getByRole('button', { name: texts.peek }), { detail: 0 });
    expect(screen.getByText('Cazador')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(PEEK_MS);
    });
    expect(screen.queryByText('Cazador')).not.toBeInTheDocument();
  });

  it('mantenida mucho rato, también se oculta sola', () => {
    render(<CardPeek role="hunter" pack={[]} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: texts.peek }));
    act(() => {
      vi.advanceTimersByTime(PEEK_MS);
    });
    expect(screen.queryByText('Cazador')).not.toBeInTheDocument();
  });

  it('el clic que sigue a soltar el dedo no la vuelve a abrir', () => {
    render(<CardPeek role="hunter" pack={[]} />);
    const button = screen.getByRole('button', { name: texts.peek });
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    fireEvent.click(button, { detail: 1 });
    expect(screen.queryByText('Cazador')).not.toBeInTheDocument();
  });
});
