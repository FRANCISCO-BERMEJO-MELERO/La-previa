import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { lobbySnapshot } from '@/test/fixtures';
import { LobbyScreen } from './LobbyScreen';

describe('LobbyScreen (04)', () => {
  it('lista a los jugadores por orden de entrada con su cuenta', () => {
    render(<LobbyScreen snapshot={lobbySnapshot()} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'FFranAnfitrión',
      'LLucía',
      'ÁÁlvaroSin conexión',
    ]);
    expect(screen.getByText('3 de 16')).toBeInTheDocument();
  });

  it('marca apagado al jugador desconectado', () => {
    render(<LobbyScreen snapshot={lobbySnapshot()} />);
    const alvaro = screen.getAllByRole('listitem')[2];
    expect(alvaro && within(alvaro).getByTestId('player-chip')).toHaveClass('border-dashed');
  });
});
