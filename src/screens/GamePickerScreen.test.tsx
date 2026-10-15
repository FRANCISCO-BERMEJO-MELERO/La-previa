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
  it('muestra los seis juegos elegibles con el elegido marcado y nada próximamente', () => {
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
    expect(screen.getByRole('button', { name: /¿Qué prefieres\?/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: /Palabras prohibidas/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getAllByText('De 3 a 16 jugadores')).toHaveLength(6);
    expect(screen.getAllByText('Elegido')).toHaveLength(1);
    expect(screen.queryByText('La bomba')).not.toBeInTheDocument();
    expect(screen.queryByText('Próximamente')).not.toBeInTheDocument();
  });

  it('lista los siete juegos, El lobo el primero, cada uno con su descripción', () => {
    renderPicker();
    const games = screen
      .getAllByRole('button')
      .filter((button) => button.hasAttribute('aria-pressed'));
    const names = [
      'El lobo',
      'El impostor',
      '¿Quién es más probable que…?',
      '¿Quién lo dijo?',
      'Una sola pista',
      '¿Qué prefieres?',
      'Palabras prohibidas',
    ];
    expect(games).toHaveLength(names.length);
    names.forEach((name, index) => {
      expect(games[index]).toHaveTextContent(name);
    });
    expect(screen.getByText(/Sale un dilema y cada uno elige en secreto/)).toBeInTheDocument();
    expect(screen.getByText(/sin decir las cinco prohibidas/)).toBeInTheDocument();
    expect(screen.getByText('De 4 a 16 jugadores')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Salir de la sala' }));
    expect(onLeaveRequest).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Sin conexión. Seguimos intentándolo; no cierres la página.'),
    ).toBeInTheDocument();
  });
});
