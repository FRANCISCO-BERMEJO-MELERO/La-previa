import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Player } from '@/games/rounds/game-view';
import { pizzaCard } from '@/test/fixtures';
import { DescribeScreen, GuessScreen, RevealScreen, WatchScreen } from './screens';

const chrome = {
  aside: <span>Ronda 2 de 10</span>,
  notice: null,
  footer: <p>pie</p>,
};

function p(name: string): Player {
  return {
    userId: `id-${name}`,
    name,
    joinIndex: 0,
    active: true,
    score: 0,
    hasResponded: false,
    connected: true,
  };
}

describe('DescribeScreen de palabras_prohibidas', () => {
  it('enseña la palabra, las cinco prohibidas y a quién se puede marcar', () => {
    const onSelect = vi.fn<(id: string) => void>();
    render(
      <DescribeScreen
        aside={chrome.aside}
        notice={null}
        {...pizzaCard}
        candidates={[p('Fran'), p('Marta')]}
        selected={null}
        busy={false}
        onSelect={onSelect}
        onGuessed={vi.fn()}
        onPass={vi.fn()}
      />,
    );
    expect(screen.getByText('Describes tú')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pizza' })).toBeInTheDocument();
    for (const word of pizzaCard.forbidden) expect(screen.getByText(word)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¿Quién ha acertado?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Toca a quien ha acertado' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Marta/ }));
    expect(onSelect).toHaveBeenCalledWith('id-Marta');
  });

  it('con alguien marcado, el botón dice quién ha acertado; también se puede pasar', () => {
    const onGuessed = vi.fn();
    const onPass = vi.fn();
    render(
      <DescribeScreen
        aside={chrome.aside}
        notice={null}
        {...pizzaCard}
        candidates={[p('Fran'), p('Marta')]}
        selected="id-Marta"
        busy={false}
        onSelect={vi.fn()}
        onGuessed={onGuessed}
        onPass={onPass}
      />,
    );
    expect(screen.getByRole('button', { name: /^Marta/ })).toHaveTextContent('Acierta');
    fireEvent.click(screen.getByRole('button', { name: 'Ha acertado Marta' }));
    expect(onGuessed).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Pasar' }));
    expect(onPass).toHaveBeenCalledTimes(1);
  });

  it('mientras se envía no deja marcar ni pasar, y enseña el error', () => {
    render(
      <DescribeScreen
        aside={chrome.aside}
        notice={null}
        {...pizzaCard}
        candidates={[p('Fran')]}
        selected="id-Fran"
        busy
        error="La partida ha avanzado mientras tanto."
        onSelect={vi.fn()}
        onGuessed={vi.fn()}
        onPass={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Ha acertado Fran' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Pasar' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('La partida ha avanzado');
  });
});

describe('WatchScreen de palabras_prohibidas', () => {
  it('enseña la tarjeta y canta la prohibida', () => {
    const onForbidden = vi.fn();
    render(
      <WatchScreen
        aside={chrome.aside}
        notice={null}
        {...pizzaCard}
        describer="Lucía"
        busy={false}
        onForbidden={onForbidden}
      />,
    );
    expect(screen.getByText('Vigilas tú')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pizza' })).toBeInTheDocument();
    expect(screen.getByText(/Si Lucía dice alguna/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '¡Prohibida!' }));
    expect(onForbidden).toHaveBeenCalledTimes(1);
  });
});

describe('GuessScreen de palabras_prohibidas', () => {
  it('dice quién describe y quién vigila, sin ninguna palabra de la tarjeta', () => {
    render(<GuessScreen {...chrome} describer="Lucía" watcher="Álvaro" />);
    expect(screen.getByText('Adivina en voz alta')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lucía' })).toBeInTheDocument();
    expect(screen.getByText('Vigila las prohibidas: Álvaro')).toBeInTheDocument();
    expect(screen.queryByText('Pizza')).not.toBeInTheDocument();
  });
});

describe('RevealScreen de palabras_prohibidas', () => {
  it('con acierto, dice quién y los dos puntos', () => {
    render(
      <RevealScreen
        {...chrome}
        {...pizzaCard}
        outcome={{ type: 'guessed', guesser: 'Marta', describer: 'Lucía' }}
      />,
    );
    expect(screen.getByText('Lo acierta Marta')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pizza' })).toBeInTheDocument();
    expect(screen.getByText('+1 para Marta y +1 para Lucía')).toBeInTheDocument();
    for (const word of pizzaCard.forbidden) expect(screen.getByText(word)).toBeInTheDocument();
  });

  it('con prohibida o pase, nadie puntúa', () => {
    const { unmount } = render(
      <RevealScreen {...chrome} {...pizzaCard} outcome={{ type: 'forbidden' }} />,
    );
    expect(screen.getByText('Se dijo una prohibida')).toBeInTheDocument();
    expect(screen.getByText('Esta ronda nadie puntúa.')).toBeInTheDocument();
    unmount();
    render(
      <RevealScreen {...chrome} {...pizzaCard} outcome={{ type: 'passed', describer: 'Lucía' }} />,
    );
    expect(screen.getByText('Lucía ha pasado')).toBeInTheDocument();
    expect(screen.getByText('Esta ronda nadie puntúa.')).toBeInTheDocument();
  });
});
