import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Player } from '@/games/rounds/game-view';
import type { TallyRow } from './game-view';
import { RevealScreen } from './RevealScreen';
import { VoteScreen } from './VoteScreen';

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
