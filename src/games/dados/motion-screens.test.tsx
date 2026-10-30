import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { transitionOf } from '@/lib/motion';
import type { DadosGameState, Snapshot } from '@/lib/snapshot';
import { dadosState, ids, inDados } from '@/test/fixtures';
import { DadosGame } from './DadosGame';

const [sideA, sideB] = dadosState().sides;

/** Lucía (B) mira cómo Fran (A) coloca un 6 en la columna 1 y le rompe sus dos seises. */
const before = inDados({
  pending_die: 6,
  my: { side: 'B', is_spectator: false, is_my_turn: false },
});
const attacked: Partial<DadosGameState> = {
  turn: { user_id: ids.lucia, side: 'B' },
  pending_die: 3,
  my: { side: 'B', is_spectator: false, is_my_turn: true },
  sides: [
    { ...sideA, board: [[4, 6], [5, 5, 4], [3]], column_scores: [10, 24, 3], total: 37 },
    { ...sideB, board: [[], [2], []], column_scores: [0, 2, 0], total: 2 },
  ],
};

function renderGame(previous: Snapshot | null, game: Partial<DadosGameState>) {
  const snapshot = inDados(game);
  if (snapshot.game?.type !== 'dados') throw new Error('sin partida de A dados');
  render(
    <DadosGame
      snapshot={snapshot}
      game={snapshot.game}
      pill={(label) => <span>{label}</span>}
      notice={null}
      busy={false}
      run={vi.fn()}
      onKickRequest={vi.fn()}
      onChangeGame={vi.fn()}
      transition={previous ? transitionOf(previous, snapshot, false) : null}
    />,
  );
}

describe('A dados en movimiento', () => {
  it('el dado del rival baja a su hueco y los míos rotos revientan con lo que pierdo', () => {
    renderGame(before, attacked);
    const rival = screen.getByRole('region', { name: 'Tablero de Fran' });
    const placed = within(rival).getAllByRole('img')[1];
    expect(placed).toHaveClass('animate-bajar');

    const mine = screen.getByRole('region', { name: 'Tu tablero' });
    const popped = within(mine).getByTestId('popped');
    expect(popped).toHaveAttribute('aria-hidden', 'true');
    const ghosts = popped.querySelectorAll('.animate-pop');
    expect(ghosts).toHaveLength(2);
    for (const ghost of ghosts) expect(ghost).toHaveClass('bg-tomato');
    expect(screen.getByText('−24')).toHaveClass('animate-flotar');
  });

  it('los marcadores cuentan y los lectores oyen ya el valor final', () => {
    renderGame(before, attacked);
    // El total del rival pasa de 31 a 37: mientras cuenta, el número visible no se lee.
    expect(screen.getByText('37', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('el dado nuevo rueda y cae con un golpe', async () => {
    renderGame(before, attacked);
    const card = screen.getByRole('heading', { name: 'Te toca' }).closest('[data-testid="card"]');
    const die = within(card instanceof HTMLElement ? card : document.body).getByRole('img');
    expect(die).toHaveClass('animate-tumble');
    // Rodando, el nombre accesible ya es el valor real.
    expect(die).toHaveAttribute('aria-label', 'Dado: 3');
    await waitFor(() => {
      expect(
        within(card instanceof HTMLElement ? card : document.body).getByRole('img'),
      ).toHaveClass('animate-thump');
    });
  });

  it('pareja: sello «×2» encima de la columna', () => {
    const pair = inDados({ pending_die: 4 });
    renderGame(pair, {
      turn: { user_id: ids.lucia, side: 'B' },
      pending_die: 1,
      my: { side: 'A', is_spectator: false, is_my_turn: false },
      sides: [
        { ...sideA, board: [[4, 4], [5, 5, 4], [3]], column_scores: [16, 24, 3], total: 43 },
        sideB,
      ],
    });
    expect(screen.getByText('×2')).toHaveClass('animate-sello-breve');
  });

  it('sin foto anterior, nada se mueve', () => {
    renderGame(null, attacked);
    expect(screen.queryByTestId('popped')).toBeNull();
    expect(document.querySelector('[class*="animate-"]')).toBeNull();
  });
});
