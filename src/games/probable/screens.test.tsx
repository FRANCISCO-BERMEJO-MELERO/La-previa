import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Player, RankingRow, TallyRow } from './game-view';
import { HostControls } from './HostControls';
import { ResultScreen } from './ResultScreen';
import { RevealScreen } from './RevealScreen';
import { VoteScreen } from './VoteScreen';
import { VoteWaitScreen } from './VoteWaitScreen';

const chrome = {
  aside: <span>Ronda 3 de 10</span>,
  notice: null,
  footer: <p>pie</p>,
};

const prompt = 'se duerma antes que nadie en una fiesta';

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

describe('VoteScreen de probable', () => {
  it('enseña la pregunta completa y deja votar a cualquiera, también a uno mismo', () => {
    const onSelect = vi.fn<(id: string) => void>();
    const { aside, notice } = chrome;
    render(
      <VoteScreen
        aside={aside}
        notice={notice}
        prompt={prompt}
        candidates={[p('Fran'), p('Lucía')]}
        selected={null}
        busy={false}
        onSelect={onSelect}
        onVote={vi.fn()}
      />,
    );
    expect(screen.getByText('¿Quién es más probable que…')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '…se duerma antes que nadie en una fiesta?' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Puedes votarte a ti/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Elige a quién votar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Fran/ }));
    expect(onSelect).toHaveBeenCalledWith('id-Fran');
  });

  it('con alguien elegido, el botón dice a quién se vota', () => {
    const onVote = vi.fn();
    render(
      <VoteScreen
        aside={chrome.aside}
        notice={null}
        prompt={prompt}
        candidates={[p('Fran'), p('Lucía', { connected: false })]}
        selected="id-Lucía"
        busy={false}
        error="Algo ha fallado."
        onSelect={vi.fn()}
        onVote={onVote}
      />,
    );
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Lucía');
    fireEvent.click(screen.getByRole('button', { name: 'Votar a Lucía' }));
    expect(onVote).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Algo ha fallado.');
  });
});

describe('VoteWaitScreen de probable', () => {
  const voters = [
    p('Fran', { hasResponded: true }),
    p('Lucía', { hasResponded: true }),
    p('Álvaro', { connected: false }),
    p('Marta'),
  ];

  it('cuenta quién ha votado y quién falta, sin decir a quién', () => {
    render(
      <VoteWaitScreen {...chrome} prompt={prompt} voters={voters} myVote="Lucía" busy={false} />,
    );
    expect(screen.getByRole('heading', { name: 'Han votado' })).toBeInTheDocument();
    expect(screen.getByText('2 de 4')).toBeInTheDocument();
    expect(screen.getByText('Tu voto: Lucía')).toBeInTheDocument();
    expect(screen.getAllByText('Ha votado')).toHaveLength(2);
    expect(screen.getByText('Pensando')).toBeInTheDocument();
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(screen.getByText('pie')).toBeInTheDocument();
  });

  it('el anfitrión puede echar a un desconectado que no vota', () => {
    const onKickRequest = vi.fn<(id: string) => void>();
    render(
      <VoteWaitScreen
        {...chrome}
        prompt={prompt}
        voters={voters}
        myVote={null}
        hint="Puedes cerrar la votación con los votos que haya."
        busy={false}
        onKickRequest={onKickRequest}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Echar a Álvaro' }));
    expect(onKickRequest).toHaveBeenCalledWith('id-Álvaro');
    expect(screen.queryByRole('button', { name: 'Echar a Marta' })).not.toBeInTheDocument();
    expect(screen.getByText(/Puedes cerrar la votación/)).toBeInTheDocument();
  });
});

describe('RevealScreen de probable', () => {
  function row(name: string, votes: number, voters: string[], winner: boolean): TallyRow {
    return { player: p(name), votes, voters, winner };
  }

  it('nombra al más votado y enseña el recuento con quién votó a quién', () => {
    render(
      <RevealScreen
        {...chrome}
        prompt={prompt}
        tally={[row('Lucía', 2, ['Fran', 'Lucía'], true), row('Fran', 1, ['Álvaro'], false)]}
      />,
    );
    expect(screen.getByText('El más votado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lucía' })).toBeInTheDocument();
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((item) => item.textContent)).toEqual([
      'LLucía2 votos de Fran y Lucía+1',
      'FFran1 voto de Álvaro',
    ]);
  });

  it('en un empate nombra a todos los empatados', () => {
    render(
      <RevealScreen
        {...chrome}
        prompt={prompt}
        tally={[row('Lucía', 1, ['Fran'], true), row('Fran', 1, ['Lucía'], true)]}
      />,
    );
    expect(screen.getByText('Empate en cabeza')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lucía y Fran' })).toBeInTheDocument();
    expect(screen.getAllByText('+1')).toHaveLength(2);
  });

  it('sin votos lo dice y nadie puntúa', () => {
    render(<RevealScreen {...chrome} prompt={prompt} tally={[]} />);
    expect(screen.getByRole('heading', { name: 'Nadie ha votado' })).toBeInTheDocument();
    expect(screen.getByText('Esta ronda nadie se lleva el punto.')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});

describe('ResultScreen de probable', () => {
  function ranked(name: string, position: number, score: number, active = true): RankingRow {
    return { player: p(name, { active }), position, score };
  }

  it('nombra al más probable de la noche y enseña la clasificación', () => {
    render(
      <ResultScreen
        {...chrome}
        leaders={[p('Lucía')]}
        ranking={[ranked('Lucía', 1, 4), ranked('Fran', 2, 1), ranked('Dani', 3, 0, false)]}
      />,
    );
    expect(screen.getByText('El más probable de la noche')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lucía' })).toBeInTheDocument();
    const list = screen.getByRole('list');
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['1.ºLLucía4 puntos', '2.ºFFran1 punto', '3.ºDDani0 puntos']);
  });

  it('con empate en cabeza nombra a todos; sin puntos, a nadie', () => {
    const { unmount } = render(
      <ResultScreen {...chrome} leaders={[p('Lucía'), p('Fran')]} ranking={[]} />,
    );
    expect(screen.getByRole('heading', { name: 'Lucía y Fran' })).toBeInTheDocument();
    unmount();
    render(<ResultScreen {...chrome} leaders={[]} ranking={[]} />);
    expect(screen.getByRole('heading', { name: 'Nadie ha sumado puntos' })).toBeInTheDocument();
  });
});

describe('HostControls de probable', () => {
  function renderControls(overrides: Partial<Parameters<typeof HostControls>[0]> = {}) {
    const props = {
      phase: 'voting' as const,
      isHost: true,
      hostName: 'Fran',
      lastRound: false,
      busy: false,
      onClose: vi.fn(),
      onNext: vi.fn(),
      onPlayAgain: vi.fn(),
      onChangeGame: vi.fn(),
      ...overrides,
    };
    render(<HostControls {...props} />);
    return props;
  }

  it('votando, el anfitrión puede cerrar con los votos que haya', () => {
    const props = renderControls();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar votación' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('en el recuento pasa de ronda, o al resultado en la última', () => {
    const props = renderControls({ phase: 'reveal' });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente ronda' }));
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });

  it('en la última ronda el botón lleva al resultado', () => {
    renderControls({ phase: 'reveal', lastRound: true });
    expect(screen.getByRole('button', { name: 'Ver resultado' })).toBeInTheDocument();
  });

  it('al final, volver a jugar o cambiar de juego', () => {
    const props = renderControls({ phase: 'finished', error: 'Algo ha fallado.' });
    fireEvent.click(screen.getByRole('button', { name: 'Volver a jugar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar de juego' }));
    expect(props.onPlayAgain).toHaveBeenCalledTimes(1);
    expect(props.onChangeGame).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Algo ha fallado.');
  });

  it.each([
    ['voting', 'Fran cerrará la votación'],
    ['reveal', 'Fran decide cuándo seguir'],
    ['finished', 'Fran decide si se vuelve a jugar'],
  ] as const)('en %s, los demás ven a quién esperan', (phase, text) => {
    renderControls({ phase, isHost: false });
    expect(screen.getByRole('status')).toHaveTextContent(text);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
