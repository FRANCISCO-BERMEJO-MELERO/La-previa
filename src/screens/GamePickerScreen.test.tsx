import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GamePickerScreen } from './GamePickerScreen';

describe('GamePickerScreen (03)', () => {
  it('muestra El impostor elegido y los próximos juegos sin poder pulsarlos', () => {
    render(
      <GamePickerScreen
        roomCode="KTRM"
        busy={false}
        offline={false}
        onLeaveRequest={vi.fn()}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: '¿A qué jugamos?' })).toBeInTheDocument();
    expect(screen.getByText('El impostor')).toBeInTheDocument();
    expect(screen.getByText('De 3 a 16 jugadores')).toBeInTheDocument();
    for (const title of ['¿Quién lo dijo?', 'Palabras prohibidas', 'La bomba', '¿Qué prefieres?']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent),
    ).toEqual(['Sala KTRM. Salir de la sala', 'Abrir la sala']);
  });

  it('abrir la sala avisa', () => {
    const onOpen = vi.fn();
    render(
      <GamePickerScreen
        roomCode="KTRM"
        busy={false}
        offline={false}
        onLeaveRequest={vi.fn()}
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abrir la sala' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('muestra el error si no se pudo abrir', () => {
    render(
      <GamePickerScreen
        roomCode="KTRM"
        busy={false}
        offline={false}
        onLeaveRequest={vi.fn()}
        error="Sin conexión."
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión.');
  });

  it('la píldora de la sala sirve para salir y avisa sin conexión', () => {
    const onLeaveRequest = vi.fn();
    render(
      <GamePickerScreen
        roomCode="KTRM"
        busy={false}
        offline
        onLeaveRequest={onLeaveRequest}
        onOpen={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sala KTRM. Salir de la sala' }));
    expect(onLeaveRequest).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Sin conexión. Seguimos intentándolo; no cierres la página.'),
    ).toBeInTheDocument();
  });
});
