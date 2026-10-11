import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Phase } from '@/lib/snapshot';
import { HostControls } from './HostControls';

function renderControls(phase: Phase, overrides: Partial<Parameters<typeof HostControls>[0]> = {}) {
  const props = {
    phase,
    isHost: true,
    hostName: 'Fran',
    gameOver: false,
    busy: false,
    onOpenVoting: vi.fn(),
    onCloseVoting: vi.fn(),
    onContinue: vi.fn(),
    onPlayAgain: vi.fn(),
    onChangeGame: vi.fn(),
    ...overrides,
  };
  render(<HostControls {...props} />);
  return props;
}

describe('HostControls', () => {
  it('hablando, el anfitrión pasa a votación', () => {
    const props = renderControls('talking');
    fireEvent.click(screen.getByRole('button', { name: 'Pasar a votación' }));
    expect(props.onOpenVoting).toHaveBeenCalledTimes(1);
  });

  it('votando, el anfitrión cierra la votación', () => {
    const props = renderControls('voting');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar votación' }));
    expect(props.onCloseVoting).toHaveBeenCalledTimes(1);
  });

  it('en la revelación sigue hablando o ve el resultado si se acaba', () => {
    const props = renderControls('reveal');
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente ronda' }));
    expect(props.onContinue).toHaveBeenCalledTimes(1);
  });

  it('si la partida se acaba, el botón dice "Ver resultado"', () => {
    renderControls('reveal', { gameOver: true });
    expect(screen.getByRole('button', { name: 'Ver resultado' })).toBeInTheDocument();
  });

  it('al terminar, volver a jugar o cambiar de juego', () => {
    const props = renderControls('finished');
    fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar de juego' }));
    expect(props.onPlayAgain).toHaveBeenCalledTimes(1);
    expect(props.onChangeGame).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['talking', 'Fran decide cuándo se vota'],
    ['voting', 'Fran cerrará la votación'],
    ['reveal', 'Fran decide cuándo seguir'],
    ['finished', 'Fran decide si se vuelve a jugar'],
  ] as const)('en %s quien no es anfitrión ve la caja de espera', (phase, text) => {
    renderControls(phase, { isHost: false });
    expect(screen.getByRole('status')).toHaveTextContent(text);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('muestra el error de la última acción', () => {
    renderControls('talking', { error: 'Sin conexión.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión.');
  });

  it('mientras trabaja no deja pulsar', () => {
    renderControls('talking', { busy: true });
    expect(screen.getByRole('button', { name: 'Pasar a votación' })).toBeDisabled();
  });
});
