import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GamePickerScreen } from './GamePickerScreen';

describe('GamePickerScreen (03)', () => {
  it('muestra El impostor elegido y los próximos juegos sin poder pulsarlos', () => {
    render(<GamePickerScreen roomCode="KTRM" busy={false} onOpen={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '¿A qué jugamos?' })).toBeInTheDocument();
    expect(screen.getByText('El impostor')).toBeInTheDocument();
    expect(screen.getByText('De 3 a 16 jugadores')).toBeInTheDocument();
    for (const title of ['¿Quién lo dijo?', 'Palabras prohibidas', 'La bomba', '¿Qué prefieres?']) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('abrir la sala avisa', () => {
    const onOpen = vi.fn();
    render(<GamePickerScreen roomCode="KTRM" busy={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir la sala' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('muestra el error si no se pudo abrir', () => {
    render(
      <GamePickerScreen roomCode="KTRM" busy={false} error="Sin conexión." onOpen={vi.fn()} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión.');
  });
});
