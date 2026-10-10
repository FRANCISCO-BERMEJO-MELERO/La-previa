import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GamePickerScreen } from './GamePickerScreen';

function renderPicker(overrides: Partial<Parameters<typeof GamePickerScreen>[0]> = {}) {
  const props = {
    roomCode: 'KTRM',
    selected: 'impostor' as const,
    busy: false,
    offline: false,
    onLeaveRequest: vi.fn(),
    onSelect: vi.fn(),
    onOpen: vi.fn(),
    ...overrides,
  };
  render(<GamePickerScreen {...props} />);
  return props;
}

describe('GamePickerScreen (03)', () => {
  it('muestra los cuatro juegos elegibles con el elegido marcado y los dos próximos sin poder pulsarlos', () => {
    renderPicker();
    expect(screen.getByRole('heading', { name: '¿A qué jugamos?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /El impostor/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /¿Quién es más probable que…\?/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /¿Quién lo dijo\?/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /Una sola pista/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getAllByText('De 3 a 16 jugadores')).toHaveLength(4);
    expect(screen.getAllByText('Elegido')).toHaveLength(1);
    expect(screen.queryByText('La bomba')).not.toBeInTheDocument();
    for (const title of ['Palabras prohibidas', '¿Qué prefieres?']) {
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: title })).not.toBeInTheDocument();
    }
  });

  it('elegir otro juego avisa de cuál', () => {
    const { onSelect } = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /¿Quién es más probable que…\?/ }));
    expect(onSelect).toHaveBeenCalledWith('probable');
  });

  it('marca el juego que llega elegido', () => {
    renderPicker({ selected: 'probable' });
    expect(screen.getByRole('button', { name: /¿Quién es más probable que…\?/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('abrir la sala avisa', () => {
    const { onOpen } = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir la sala' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('muestra el error si no se pudo abrir', () => {
    renderPicker({ error: 'Sin conexión.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión.');
  });

  it('la píldora de la sala sirve para salir y avisa sin conexión', () => {
    const { onLeaveRequest } = renderPicker({ offline: true });
    fireEvent.click(screen.getByRole('button', { name: 'Sala KTRM. Salir de la sala' }));
    expect(onLeaveRequest).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Sin conexión. Seguimos intentándolo; no cierres la página.'),
    ).toBeInTheDocument();
  });
});
