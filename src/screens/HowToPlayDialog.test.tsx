import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { copy } from '@/lib/copy';
import { gameIds } from '@/lib/snapshot';
import { HowToPlayDialog } from './HowToPlayDialog';

describe('HowToPlayDialog', () => {
  it('se recorre paso a paso, hacia delante y hacia atrás', () => {
    render(<HowToPlayDialog open game="impostor" onClose={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Cómo se juega a El impostor' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Una palabra para todos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Paso 2 de 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('heading', { name: 'Votad y expulsad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText('Paso 2 de 3')).toBeInTheDocument();
  });

  it('al cerrarlo y volver a abrirlo empieza por el principio', () => {
    const onClose = vi.fn();
    const { rerender } = render(<HowToPlayDialog open game="probable" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onClose).toHaveBeenCalled();
    rerender(<HowToPlayDialog open={false} game="probable" onClose={onClose} />);
    rerender(<HowToPlayDialog open game="probable" onClose={onClose} />);
    expect(screen.getByText('Paso 1 de 3')).toBeInTheDocument();
  });

  it.each(gameIds)('%s tiene sus pasos', (game) => {
    expect(copy.howTo.steps[game].length).toBeGreaterThanOrEqual(3);
    render(<HowToPlayDialog open game={game} onClose={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: copy.howTo.steps[game][0].title }),
    ).toBeInTheDocument();
  });
});
