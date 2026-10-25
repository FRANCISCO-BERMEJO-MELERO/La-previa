import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { dadosState, dadosTeamsState, ids, inDados } from '@/test/fixtures';
import type { DadosGameState, Snapshot } from '@/lib/snapshot';
import { DadosGame } from './DadosGame';
import { DadosSettings } from './DadosSettings';
import { choicesFor } from './teams';

function renderGame(game: DadosGameState, rest: Partial<Snapshot> = {}) {
  const snapshot = { ...inDados({}, rest), game };
  const run = vi.fn(() => Promise.resolve(true));
  const onKickRequest = vi.fn();
  const onChangeGame = vi.fn();
  render(
    <DadosGame
      snapshot={snapshot}
      game={game}
      pill={(label) => <span>{label}</span>}
      notice={null}
      busy={false}
      run={run}
      onKickRequest={onKickRequest}
      onChangeGame={onChangeGame}
    />,
  );
  return { run, onKickRequest, onChangeGame };
}

describe('partida de A dados', () => {
  it('si te toca, cada columna es un botón y la llena está desactivada', () => {
    const { run } = renderGame(dadosState());
    expect(screen.getByText('A dados')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Te toca' })).toBeInTheDocument();
    expect(
      screen.getByText('Te ha salido un 5. Toca la columna donde lo quieres.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Colocar el dado en la columna 2' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Colocar el dado en la columna 3' }));
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('pinta los dados con puntos, sus colores y los puntos de cada columna', () => {
    renderGame(dadosState());
    const mine = screen.getByRole('region', { name: 'Tu tablero' });
    const dice = within(mine).getAllByRole('img');
    expect(dice.map((die) => die.getAttribute('aria-label'))).toEqual([
      'Dado: 4',
      'Dado: 5',
      'Dado: 5',
      'Dado: 4',
      'Dado: 3',
    ]);
    expect(dice.map((die) => die.dataset.tone)).toEqual([
      'single',
      'pair',
      'pair',
      'single',
      'single',
    ]);
    expect(screen.getByText('Columna 2: 24 puntos')).toBeInTheDocument();
    expect(screen.getByText('Tú: 31 puntos')).toBeInTheDocument();
    expect(screen.getByText('Lucía: 26 puntos')).toBeInTheDocument();
  });

  it('si no te toca, no hay botones y se dice quién decide con qué dado', () => {
    renderGame(dadosTeamsState(), { me: { user_id: ids.fran, name: 'Fran', is_host: true } });
    expect(screen.getByText('A dados · 2 contra 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Colocar el dado/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Le toca a Marta. Decide dónde va el 3.');
    const order = screen.getByRole('list', { name: 'Orden de turnos' });
    expect(within(order).getByText('Marta')).toHaveAttribute('aria-current', 'step');
    expect(within(order).getByText('Fran')).not.toHaveAttribute('aria-current');
    expect(screen.getByText('Tu equipo')).toBeInTheDocument();
    expect(screen.getByText('Equipo B')).toBeInTheDocument();
  });

  it('quien mira ve la mesa sin botones y los nombres de cada bando', () => {
    renderGame(dadosState({ my: { side: null, is_spectator: true, is_my_turn: false } }));
    expect(screen.queryByRole('button', { name: /Colocar el dado/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Le toca a Fran');
    expect(screen.queryByText('Tú')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Tablero de Fran' })).toBeInTheDocument();
  });

  it('el anfitrión puede echar a quien tiene el turno si se ha desconectado', () => {
    const base = inDados();
    const players = base.players.map((player) =>
      player.user_id === ids.lucia ? { ...player, connected: false } : player,
    );
    const { onKickRequest } = renderGame(
      dadosState({
        turn: { user_id: ids.lucia, side: 'B' },
        my: { side: 'A', is_spectator: false, is_my_turn: false },
      }),
      { players },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Echar a Lucía' }));
    expect(onKickRequest).toHaveBeenCalledWith(ids.lucia);
  });

  it('el resultado da el titular, el marcador y una tarjeta por bando', () => {
    const { run, onChangeGame } = renderGame(
      dadosState({
        phase: 'finished',
        turn: null,
        pending_die: null,
        result: { winner: 'B', reason: 'board_full', left: null },
      }),
    );
    expect(screen.getByRole('heading', { name: 'Has perdido' })).toBeInTheDocument();
    expect(screen.getByText('Lucía se lleva la mesa: 26 a 31.')).toBeInTheDocument();
    expect(screen.getByText('Ganador')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
    expect(run).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar de juego' }));
    expect(onChangeGame).toHaveBeenCalledTimes(1);
  });

  it('quien no lleva la sala espera en el resultado', () => {
    renderGame(
      dadosState({
        phase: 'finished',
        turn: null,
        pending_die: null,
        result: { winner: null, reason: 'board_full', left: null },
      }),
      { me: { user_id: ids.lucia, name: 'Lucía', is_host: false } },
    );
    expect(screen.getByRole('heading', { name: 'Empate' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver a jugar' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Fran elige si jugáis otra');
  });
});

describe('sala de espera de A dados', () => {
  const players = inDados().players;

  function renderSettings(mode: '1v1' | '2v2') {
    const onModeChange = vi.fn();
    const onChoose = vi.fn();
    render(
      <DadosSettings
        players={players}
        mode={mode}
        choices={choicesFor(players, mode, {})}
        onModeChange={onModeChange}
        onChoose={onChoose}
      />,
    );
    return { onModeChange, onChoose };
  }

  it('marca la modalidad elegida y deja cambiarla', () => {
    const { onModeChange } = renderSettings('1v1');
    expect(screen.getByRole('button', { name: '1 contra 1' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: '2 contra 2' }));
    expect(onModeChange).toHaveBeenCalledWith('2v2');
  });

  it('una fila por miembro con A, B y Mira, y cuántos hay en cada equipo', () => {
    const { onChoose } = renderSettings('2v2');
    expect(screen.getByRole('button', { name: 'Fran juega en el equipo A' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Marta juega en el equipo B' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Equipo A: 2 de 2')).toHaveTextContent('A · 2/2');
    fireEvent.click(screen.getByRole('button', { name: 'Marta mira' }));
    expect(onChoose).toHaveBeenCalledWith(ids.marta, 'watch');
  });
});
