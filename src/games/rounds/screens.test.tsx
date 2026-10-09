import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CandidateList } from './CandidateList';
import type { Player, RankingRow } from './game-view';
import { ResultScreen } from './ResultScreen';
import { RoundControls } from './RoundControls';
import { WaitScreen } from './WaitScreen';

const chrome = {
  aside: <span>Ronda 3 de 10</span>,
  notice: null,
  footer: <p>pie</p>,
};

function p(name: string, overrides: Partial<Player> = {}): Player {
  return {
    userId: `id-${name}`,
    name,
    joinIndex: 0,
    active: true,
    score: 0,
    hasResponded: false,
    connected: true,
    ...overrides,
  };
}

describe('CandidateList', () => {
  it('marca al elegido y avisa al tocar a otro', () => {
    const onSelect = vi.fn<(id: string) => void>();
    render(
      <CandidateList
        candidates={[p('Fran'), p('Lucía', { connected: false })]}
        selected="id-Fran"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Fran');
    expect(screen.getByRole('button', { pressed: false })).toHaveTextContent('Sin conexión');
    fireEvent.click(screen.getByRole('button', { name: /Lucía/ }));
    expect(onSelect).toHaveBeenCalledWith('id-Lucía');
  });
});

describe('WaitScreen', () => {
  const responders = [
    p('Fran', { hasResponded: true }),
    p('Lucía', { hasResponded: true }),
    p('Álvaro', { connected: false }),
    p('Marta'),
  ];

  it('cuenta quién ha respondido y quién falta', () => {
    render(
      <WaitScreen
        {...chrome}
        label="Han votado"
        done={2}
        total={4}
        responders={responders}
        doneDetail="Ha votado"
        busy={false}
      >
        <p>Tu voto: Lucía</p>
      </WaitScreen>,
    );
    expect(screen.getByRole('heading', { name: 'Han votado' })).toBeInTheDocument();
    expect(screen.getByText('2 de 4')).toBeInTheDocument();
    expect(screen.getByText('Tu voto: Lucía')).toBeInTheDocument();
    expect(screen.getAllByText('Ha votado')).toHaveLength(2);
    expect(screen.getByText('Pensando')).toBeInTheDocument();
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(screen.getByText('pie')).toBeInTheDocument();
  });

  it('sin lista de quién responde, solo enseña el contador', () => {
    render(
      <WaitScreen
        {...chrome}
        label="Han votado"
        done={1}
        total={3}
        doneDetail="Ha votado"
        busy={false}
      />,
    );
    expect(screen.getByText('1 de 3')).toBeInTheDocument();
    expect(screen.queryByTestId('player-chip')).not.toBeInTheDocument();
  });

  it('el anfitrión puede echar a un desconectado que no responde', () => {
    const onKickRequest = vi.fn<(id: string) => void>();
    render(
      <WaitScreen
        {...chrome}
        label="Han respondido"
        done={2}
        total={4}
        responders={responders}
        doneDetail="Ha respondido"
        hint="Puedes cerrar con lo que haya."
        busy={false}
        onKickRequest={onKickRequest}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Echar a Álvaro' }));
    expect(onKickRequest).toHaveBeenCalledWith('id-Álvaro');
    expect(screen.queryByRole('button', { name: 'Echar a Marta' })).not.toBeInTheDocument();
    expect(screen.getByText('Puedes cerrar con lo que haya.')).toBeInTheDocument();
  });
});

describe('ResultScreen', () => {
  function ranked(name: string, position: number, score: number, active = true): RankingRow {
    return { player: p(name, { active }), position, score };
  }

  it('nombra al ganador con la píldora del juego y enseña la clasificación', () => {
    render(
      <ResultScreen
        {...chrome}
        pill="El más probable de la noche"
        accent="sky"
        leaders={[p('Lucía')]}
        ranking={[ranked('Lucía', 1, 4), ranked('Fran', 2, 1), ranked('Dani', 3, 0, false)]}
      />,
    );
    expect(screen.getByText('El más probable de la noche')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lucía' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('list'))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['1.ºLLucía4 puntos', '2.ºFFran1 punto', '3.ºDDani0 puntos']);
  });

  it('con empate en cabeza nombra a todos; sin puntos, a nadie', () => {
    const { unmount } = render(
      <ResultScreen
        {...chrome}
        pill="Gana"
        accent="lilac"
        leaders={[p('Lucía'), p('Fran')]}
        ranking={[]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Lucía y Fran' })).toBeInTheDocument();
    unmount();
    render(<ResultScreen {...chrome} pill="Gana" accent="lilac" leaders={[]} ranking={[]} />);
    expect(screen.getByRole('heading', { name: 'Nadie ha sumado puntos' })).toBeInTheDocument();
  });
});

describe('RoundControls', () => {
  function renderControls(overrides: Partial<Parameters<typeof RoundControls>[0]> = {}) {
    const props = {
      isHost: true,
      waiting: 'Fran cerrará la votación',
      finished: false,
      advanceLabel: 'Cerrar votación',
      busy: false,
      onAdvance: vi.fn(),
      onPlayAgain: vi.fn(),
      onChangeGame: vi.fn(),
      ...overrides,
    };
    render(<RoundControls {...props} />);
    return props;
  }

  it('el anfitrión avanza la fase con el botón que toca', () => {
    const props = renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar votación' }));
    expect(props.onAdvance).toHaveBeenCalledTimes(1);
  });

  it('al final, volver a jugar o cambiar de juego, con el error si lo hay', () => {
    const props = renderControls({ finished: true, error: 'Algo ha fallado.' });
    fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar de juego' }));
    expect(props.onPlayAgain).toHaveBeenCalledTimes(1);
    expect(props.onChangeGame).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Algo ha fallado.');
  });

  it('los demás ven a quién esperan y ningún botón', () => {
    renderControls({ isHost: false });
    expect(screen.getByRole('status')).toHaveTextContent('Fran cerrará la votación');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
