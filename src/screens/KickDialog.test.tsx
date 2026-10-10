import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { KickDialog } from './KickDialog';

describe('KickDialog', () => {
  it('sin jugador elegido está cerrado', () => {
    render(<KickDialog name={null} busy={false} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pide confirmar a quién se echa', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<KickDialog name="Álvaro" busy={false} onCancel={onCancel} onConfirm={onConfirm} />);
    expect(screen.getByRole('dialog', { name: '¿Echar a Álvaro?' })).toBeInTheDocument();
    expect(screen.getByText('Podrá volver a entrar con el código si quiere.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Echar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('mientras trabaja no deja confirmar', () => {
    render(<KickDialog name="Álvaro" busy onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Echar' })).toBeDisabled();
  });
});
